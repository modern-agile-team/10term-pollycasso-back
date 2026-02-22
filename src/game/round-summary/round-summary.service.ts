import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import {
  GAME_STATE_STORE,
  GamePhase,
  type IGameStateStore,
  type GameState,
  type RoundSummaryPhaseContext,
} from 'src/game-state/interfaces/game-state.interface';
import { GameSessionService } from '../session/game-session.service';
import { GAME_EVENTS } from '../constants/game.constant';
import { RoomUpdatePlayerPayload } from '../interfaces/game.interface';

@Injectable()
export class RoundSummaryService {
  constructor(
    @Inject(forwardRef(() => GameSessionService))
    private readonly gameSessionService: GameSessionService,
    @Inject(GAME_STATE_STORE) private readonly store: IGameStateStore,
  ) {}

  private roomKey(roomId: number) {
    return `game:room:${roomId}`;
  }

  private broadcastPlayerReady(server: Server, roomId: number, userId: number, isReady: boolean) {
    const payload: RoomUpdatePlayerPayload = {
      userId,
      changes: { isReady },
    };

    server.to(this.roomKey(roomId)).emit(GAME_EVENTS.ROOM_UPDATE_PLAYER, payload);
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

    const summaryCtx = ctx;
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

    const readySet = new Set(patchedCtx.readyUserIds ?? []);
    const allReady = allUserIds.length > 0 && allUserIds.every((id) => readySet.has(id));
    if (!allReady) return;

    await this.gameSessionService.advanceFromRoundSummary({ roomId, server });
  }
}
