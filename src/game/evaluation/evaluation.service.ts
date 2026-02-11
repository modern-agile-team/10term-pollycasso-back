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
import type {
  AckResponse,
  EvaluationSubmitPayload,
  PlayerId,
} from './interfaces/evaluation.interface';
import { ROUND_SUMMARY_MS, SCORE_MAX, SCORE_MIN } from './constants/evaluation.constant';
import {
  type EvaluationMemoryStore,
  ensureEvaluationState,
  upsertEvaluation,
} from './evaluation.inmemory';

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

  private getEvaluatingContextOrNull(gs: GameState): EvaluatingContext | null {
    const ctx = gs.phaseContext;
    if (!ctx || ctx.kind !== GamePhase.EVALUATING) return null;
    return ctx as EvaluatingContext;
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
    const gs = await this.store.get(roomId);
    if (!gs || gs.phase !== GamePhase.EVALUATING) return;

    const ctx = this.getEvaluatingContextOrNull(gs);
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

  private isEvaluationCompleteForUser(roomId: number, gs: GameState, userId: PlayerId): boolean {
    const st = this.getState(roomId);
    const ctx = this.getEvaluatingContextOrNull(gs);
    if (!ctx) return false;

    const round = gs.currentRound;
    if (round == null) return false;

    const myRoomMemberId = gs.roomMemberIdByUserId?.[userId];
    if (myRoomMemberId == null) return false;

    const myDrawingId = makeDrawingId(gs.matchId, myRoomMemberId, round);

    const requiredDrawingIds = (ctx.activeUserIds ?? [])
      .filter((uid) => uid !== userId)
      .map((uid) => {
        const rmId = gs.roomMemberIdByUserId?.[uid];
        if (rmId == null) return null;
        return makeDrawingId(gs.matchId, rmId, round);
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

  async toggleReady(roomId: number, gs: GameState, userId: PlayerId): Promise<AckResponse> {
    if (gs.phase !== GamePhase.EVALUATING) return { ok: false, code: 'INVALID_PHASE' };

    const ctx = this.getEvaluatingContextOrNull(gs);
    if (!ctx) return { ok: false, code: 'CONTEXT_INVALID' };

    const alreadyReady = (ctx.readyUserIds ?? []).includes(userId);
    const willBeReady = !alreadyReady;

    if (willBeReady) {
      const complete = this.isEvaluationCompleteForUser(roomId, gs, userId);
      if (!complete) return { ok: false, code: 'EVALUATION_INCOMPLETE' };
    }

    const nextReady = willBeReady
      ? Array.from(new Set([...(ctx.readyUserIds ?? []), userId]))
      : (ctx.readyUserIds ?? []).filter((id) => id !== userId);

    const patched = await this.store.patch(roomId, {
      phaseContext: { ...ctx, readyUserIds: nextReady },
    });

    if (!patched) return { ok: false, code: 'STATE_PATCH_FAILED' };

    const patchedCtx = this.getEvaluatingContextOrNull(patched);
    return { ok: true, allReady: patchedCtx ? this.isAllReady(patchedCtx) : false };
  }

  submitEvaluation(
    roomId: number,
    gs: GameState,
    userId: PlayerId,
    payload: EvaluationSubmitPayload,
  ): AckResponse {
    if (gs.phase !== GamePhase.EVALUATING) return { ok: false, code: 'INVALID_PHASE' };
    if (!this.validateScore(payload.score)) return { ok: false, code: 'INVALID_SCORE' };

    upsertEvaluation(this.memory, roomId, userId, payload);
    return { ok: true };
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
    gs: GameState;
    ctx: EvaluatingContext;
    nicknameByUserId: Record<number, string>;
    roundScores: Record<string, number>;
    totalScores: Record<string, number>;
  }): RoundRankItem[] {
    const { gs, ctx, nicknameByUserId, roundScores, totalScores } = params;
    const round = gs.currentRound!;
    const activeUserIds = ctx.activeUserIds ?? [];

    const items: RoundRankItem[] = activeUserIds
      .map((userId) => {
        const roomMemberId = gs.roomMemberIdByUserId?.[userId];
        if (roomMemberId == null) return null;

        const drawingId = makeDrawingId(gs.matchId, roomMemberId, round);

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
    gs: GameState;
    nicknameByUserId: Record<number, string>;
    summaryEndsAtMs?: number;
  }): Promise<RoundSummaryComputeResult> {
    const { roomId, gs, nicknameByUserId, summaryEndsAtMs = ROUND_SUMMARY_MS } = params;

    const ctx = this.getEvaluatingContextOrNull(gs);
    if (!ctx) {
      throw new Error('CONTEXT_INVALID');
    }
    if (gs.currentRound == null) throw new Error('ROUND_MISSING');

    const roundScores = this.computeRoundScoresByDrawingId(roomId);
    const updatedTotals = this.mergeTotals(gs.totalScores ?? {}, roundScores);

    const rankings = this.buildRankings({
      gs,
      ctx,
      nicknameByUserId,
      roundScores,
      totalScores: updatedTotals,
    });

    const drawingsById = await this.drawingRepository.getDrawingsByMatchAndRound({
      matchId: gs.matchId,
      round: gs.currentRound,
    });

    const phaseContext: RoundSummaryPhaseContext = {
      kind: GamePhase.ROUND_SUMMARY,
      rankings,
      drawingsById,
    };

    return { phaseContext, updatedTotals, summaryEndsAtMs };
  }
}
