import { Inject, Injectable } from '@nestjs/common';
import {
  EvaluatingContext,
  GamePhase,
  GameState,
  GAME_STATE_STORE,
  type IGameStateStore,
  RoundRankItem,
  RoundSummaryPhaseContext,
} from '../../game-state/interfaces/game-state.interface';
import { DRAWING_REPO, type IDrawingRepo } from '../drawing/interface/drawing.interface';
import type { EvaluationSubmitPayload, PlayerId } from './interfaces/evaluation.interface';
import {
  EVALUATION_ERRORS,
  ROUND_SUMMARY_MS,
  SCORE_MAX,
  SCORE_MIN,
} from './constants/evaluation.constant';
import {
  type EvaluationMemoryStore,
  ensureEvaluationState,
  upsertEvaluation,
} from './evaluation.inmemory';
import { wsError } from 'src/common/utils/ws-error.util';

export const makeDrawingId = (matchId: number, roomMemberId: number, round: number) =>
  `${matchId}:${roomMemberId}:${round}`;

export type RoundSummaryComputeResult = {
  phaseContext: RoundSummaryPhaseContext;
  updatedTotals: Record<string, number>;
  summaryEndsAtMs: number;
};

@Injectable()
export class EvaluationService {
  constructor(
    @Inject(GAME_STATE_STORE) private readonly store: IGameStateStore,
    @Inject(DRAWING_REPO) private readonly drawingRepository: IDrawingRepo,
  ) {}

  private readonly memory: EvaluationMemoryStore = new Map();

  private getState(roomId: number) {
    return ensureEvaluationState(this.memory, roomId);
  }

  private validateScore(score: number): boolean {
    return Number.isInteger(score) && score >= SCORE_MIN && score <= SCORE_MAX;
  }

  private getEvaluatingContextOrNull(gameState: GameState): EvaluatingContext | null {
    const ctx = gameState.phaseContext;
    if (!ctx || ctx.kind !== GamePhase.EVALUATING) return null;
    return ctx;
  }

  resetForEvaluating(roomId: number) {
    const st = this.getState(roomId);
    st.evaluations.clear();
    st.isPhaseEnded = false;

    if (st.evaluationTimer) {
      clearTimeout(st.evaluationTimer);
      st.evaluationTimer = null;
    }
  }

  async handleDisconnect(roomId: number, userId: number): Promise<void> {
    const gameState = await this.store.get(roomId);
    if (!gameState || gameState.phase !== GamePhase.EVALUATING) return;

    const ctx = this.getEvaluatingContextOrNull(gameState);
    if (!ctx) return;

    const nextActive = (ctx.activeUserIds ?? []).filter((id) => id !== userId);
    const nextReady = (ctx.readyUserIds ?? []).filter((id) => id !== userId);

    await this.store.patch(roomId, {
      phaseContext: { ...ctx, activeUserIds: nextActive, readyUserIds: nextReady },
    });
  }

  private isAllReady(ctx: EvaluatingContext): boolean {
    const active = ctx.activeUserIds ?? [];
    const ready = new Set(ctx.readyUserIds ?? []);
    return active.length > 0 && active.every((uid) => ready.has(uid));
  }

  private isEvaluationCompleteForUser(
    roomId: number,
    gameState: GameState,
    userId: PlayerId,
  ): boolean {
    const st = this.getState(roomId);
    const ctx = this.getEvaluatingContextOrNull(gameState);
    if (!ctx) return false;

    const round = gameState.currentRound;
    if (round == null) return false;

    const myRoomMemberId = gameState.roomMemberIdByUserId?.[userId];
    if (myRoomMemberId == null) return false;

    const myDrawingId = makeDrawingId(gameState.matchId, myRoomMemberId, round);

    const requiredDrawingIds = (ctx.activeUserIds ?? [])
      .filter((uid) => uid !== userId)
      .map((uid) => {
        const rmId = gameState.roomMemberIdByUserId?.[uid];
        if (rmId == null) return null;
        return makeDrawingId(gameState.matchId, rmId, round);
      })
      .filter((v): v is string => !!v && v !== myDrawingId);

    const perUser = st.evaluations.get(userId);
    if (!perUser) return requiredDrawingIds.length === 0;

    for (const drawingId of requiredDrawingIds) {
      const score = perUser.get(drawingId);
      if (score == null) return false;
      if (!this.validateScore(score)) return false;
    }
    return true;
  }

  async toggleReady(
    roomId: number,
    gameState: GameState,
    userId: PlayerId,
  ): Promise<{ isReady: boolean; allReady: boolean }> {
    if (gameState.phase !== GamePhase.EVALUATING) {
      throw wsError(400, EVALUATION_ERRORS.INVALID_PHASE);
    }

    const ctx = this.getEvaluatingContextOrNull(gameState);
    if (!ctx) {
      throw wsError(500, EVALUATION_ERRORS.CONTEXT_INVALID);
    }

    const alreadyReady = (ctx.readyUserIds ?? []).includes(userId);
    const willBeReady = !alreadyReady;

    if (willBeReady) {
      const complete = this.isEvaluationCompleteForUser(roomId, gameState, userId);
      if (!complete) {
        throw wsError(400, EVALUATION_ERRORS.EVALUATION_INCOMPLETE);
      }
    }

    const nextReady = willBeReady
      ? Array.from(new Set([...(ctx.readyUserIds ?? []), userId]))
      : (ctx.readyUserIds ?? []).filter((id) => id !== userId);

    const patched = await this.store.patch(roomId, {
      phaseContext: { ...ctx, readyUserIds: nextReady },
    });

    if (!patched) {
      throw wsError(500, EVALUATION_ERRORS.STATE_PATCH_FAILED);
    }

    const patchedCtx = this.getEvaluatingContextOrNull(patched);
    const allReady = patchedCtx ? this.isAllReady(patchedCtx) : false;

    return { isReady: willBeReady, allReady };
  }

  submitEvaluation(
    roomId: number,
    gameState: GameState,
    userId: PlayerId,
    payload: EvaluationSubmitPayload,
  ): void {
    if (gameState.phase !== GamePhase.EVALUATING) {
      throw wsError(400, EVALUATION_ERRORS.INVALID_PHASE);
    }

    if (!this.validateScore(payload.score)) {
      throw wsError(400, EVALUATION_ERRORS.INVALID_SCORE);
    }

    upsertEvaluation(this.memory, roomId, userId, payload);
  }

  tryBeginSummaryTransition(roomId: number): boolean {
    const st = this.getState(roomId);
    if (st.isPhaseEnded) return false;
    st.isPhaseEnded = true;
    return true;
  }

  private computeRoundScoresByDrawingId(roomId: number): Record<string, number> {
    const st = this.getState(roomId);
    const totals = new Map<string, number>();

    for (const [, perUser] of st.evaluations.entries()) {
      for (const [drawingId, score] of perUser.entries()) {
        totals.set(drawingId, (totals.get(drawingId) ?? 0) + score);
      }
    }
    return Object.fromEntries(totals.entries());
  }

  private mergeTotals(
    base: Record<string, number>,
    delta: Record<string, number>,
  ): Record<string, number> {
    const out: Record<string, number> = { ...base };
    for (const [drawingId, add] of Object.entries(delta)) {
      out[drawingId] = (out[drawingId] ?? 0) + (add ?? 0);
    }
    return out;
  }

  private buildRankings(params: {
    gameState: GameState;
    ctx: EvaluatingContext;
    nicknameByUserId: Record<number, string>;
    roundScores: Record<string, number>;
    totalScores: Record<string, number>;
  }): RoundRankItem[] {
    const { gameState, ctx, nicknameByUserId, roundScores, totalScores } = params;
    const round = gameState.currentRound!;
    const activeUserIds = ctx.activeUserIds ?? [];

    const items: RoundRankItem[] = activeUserIds
      .map((userId) => {
        const roomMemberId = gameState.roomMemberIdByUserId?.[userId];
        if (roomMemberId == null) return null;

        const drawingId = makeDrawingId(gameState.matchId, roomMemberId, round);

        return {
          roomMemberId,
          nickname: nicknameByUserId[userId] ?? '',
          drawingId,
          score: roundScores[drawingId] ?? 0,
          totalScore: totalScores[drawingId] ?? 0,
        };
      })
      .filter((v): v is RoundRankItem => !!v);

    items.sort(
      (a, b) => b.score - a.score || b.totalScore - a.totalScore || a.roomMemberId - b.roomMemberId,
    );
    return items;
  }

  async computeRoundSummary(params: {
    roomId: number;
    gameState: GameState;
    nicknameByUserId: Record<number, string>;
    summaryEndsAtMs?: number;
  }): Promise<RoundSummaryComputeResult> {
    const { roomId, gameState, nicknameByUserId, summaryEndsAtMs = ROUND_SUMMARY_MS } = params;

    const ctx = this.getEvaluatingContextOrNull(gameState);
    if (!ctx) {
      throw wsError(400, EVALUATION_ERRORS.CONTEXT_INVALID);
    }

    if (gameState.currentRound == null) {
      throw wsError(400, EVALUATION_ERRORS.ROUND_MISSING);
    }

    const roundScores = this.computeRoundScoresByDrawingId(roomId);
    const updatedTotals = this.mergeTotals(gameState.totalScores ?? {}, roundScores);

    const rankings = this.buildRankings({
      gameState,
      ctx,
      nicknameByUserId,
      roundScores,
      totalScores: updatedTotals,
    });

    const drawingsById = await this.drawingRepository.getDrawingsByMatchAndRound({
      matchId: gameState.matchId,
      round: gameState.currentRound,
    });

    const phaseContext: RoundSummaryPhaseContext = {
      kind: GamePhase.ROUND_SUMMARY,
      rankings,
      drawingsById,
    };

    return { phaseContext, updatedTotals, summaryEndsAtMs };
  }
}
