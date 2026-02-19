import { Inject, Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  GAME_STATE_STORE,
  GamePhase,
  type IGameStateStore,
  type GameState,
  type RoundSummaryPhaseContext,
} from 'src/game-state/interfaces/game-state.interface';
import { ROUND_SUMMARY_EVENTS } from './constants/round-summary.constants';
import { GameSessionService } from '../session/game-session.service';

@Injectable()
export class RoundSummaryService {
  constructor(
    private readonly gameSessionService: GameSessionService,
    @Inject(GAME_STATE_STORE) private readonly store: IGameStateStore,
  ) {}

  private roomKey(roomId: number) {
    return `game:room:${roomId}`;
  }

  private broadcastPlayerReady(server: Server, roomId: number, userId: number, isReady: boolean) {
    server
      .to(this.roomKey(roomId))
      .emit(ROUND_SUMMARY_EVENTS.ROOM_UPDATE_PLAYER, { userId, isReady });
  }

  private getAllUserIdsFromState(state: GameState): number[] {
    return Object.keys(state.roomMemberIdByUserId).map(Number);
  }

  async handleReadyToggle(server: Server, roomId: number, userId: number) {
    const state = await this.store.get(roomId);
    if (!state) return;
    if (state.phase !== GamePhase.ROUND_SUMMARY) return;
    if (!(userId in state.roomMemberIdByUserId)) return;

    const ctx = state.phaseContext;
    if (!ctx || ctx.kind !== GamePhase.ROUND_SUMMARY) return;

    const summaryCtx = ctx as RoundSummaryPhaseContext;
    const currentReady = summaryCtx.readyUserIds ?? [];

    const wasReady = currentReady.includes(userId);
    const nextReady = wasReady
      ? currentReady.filter((id) => id !== userId)
      : [...currentReady, userId];
    const isReady = !wasReady;

    const patched = await this.store.patch(roomId, {
      phaseContext: { ...summaryCtx, readyUserIds: nextReady } satisfies RoundSummaryPhaseContext,
    });
    if (!patched) return;

    this.broadcastPlayerReady(server, roomId, userId, isReady);

    const allUserIds = this.getAllUserIdsFromState(patched);
    const patchedCtx = patched.phaseContext;
    if (!patchedCtx || patchedCtx.kind !== GamePhase.ROUND_SUMMARY) return;

    const readySet = new Set((patchedCtx as RoundSummaryPhaseContext).readyUserIds ?? []);
    const allReady = allUserIds.length > 0 && allUserIds.every((id) => readySet.has(id));
    if (!allReady) return;

    await this.gameSessionService.advanceFromRoundSummary({ roomId, server });
  }
}
