import { Inject, Injectable, ConflictException } from '@nestjs/common';
import type { DrawData, DrawLine } from './interface/drawing.interface';
import {
  GAME_STATE_STORE,
  GamePhase,
  GameState,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import { Prisma } from '@prisma/client';
import { DrawingStore } from './drawing.store';
import { DrawingRepository } from './drawing.repository';
import { DRAWING_ERRORS } from './constants/drawing.constant';
import { DrawingPhaseContextEntity } from './entities/drawing.entity';

@Injectable()
export class DrawingService {
  constructor(
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
    private readonly drawingStore: DrawingStore,
    private readonly drawingRepository: DrawingRepository,
  ) {}

  // 그리기 입력 수신 및 Redis 누적
  async sendDrawingLine(params: { roomId: number; userId: number; line: DrawLine }): Promise<void> {
    const { roomId, userId, line } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state) throw new ConflictException(DRAWING_ERRORS.GAME_STATE_NOT_FOUND);
    this.assertDrawing(state);

    const ctxEntity = DrawingPhaseContextEntity.from(state.phaseContext);
    ctxEntity.ensureActive(userId);

    const round = state.currentRound ?? 1;

    await this.drawingStore.appendStroke({
      roomId,
      round,
      userId,
      line,
      ttlSeconds: 3600,
    });
  }

  // 제출 처리 및 전원 완료 시 DB 커밋/정리
  async submitDrawing(params: { roomId: number; userId: number }): Promise<{
    shouldAdvance: boolean;
    playerUpdate?: { userId: number; changes: { isReady: true } };
  }> {
    const { roomId, userId } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state) throw new ConflictException(DRAWING_ERRORS.GAME_STATE_NOT_FOUND);
    this.assertDrawing(state);

    const ctxEntity = DrawingPhaseContextEntity.from(state.phaseContext);

    const becameReady = ctxEntity.markReady(userId);

    const patched = await this.gameStateStore.patch(roomId, {
      phaseContext: ctxEntity.toPlain(),
    });
    if (!patched) throw new ConflictException(DRAWING_ERRORS.GAME_STATE_NOT_FOUND);

    const shouldAdvance = ctxEntity.shouldAdvance();

    if (shouldAdvance) {
      const round = state.currentRound ?? 1;
      const activeUserIds = ctxEntity.getActiveUserIds();

      await this.commitAllActiveUsersToDb({
        roomId,
        round,
        state,
        activeUserIds,
      });

      await this.drawingStore.cleanupStrokes({
        roomId,
        round,
        userIds: activeUserIds,
      });
    }

    return {
      shouldAdvance,
      playerUpdate: becameReady ? { userId, changes: { isReady: true } } : undefined,
    };
  }

  // 연결 해제 처리 및 조건 충족 시 DB 커밋/정리
  async handleDisconnect(params: { roomId: number; userId: number }): Promise<{
    shouldAdvance: boolean;
    playerUpdate?: { userId: number; changes: { isConnected: false } };
  }> {
    const { roomId, userId } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state) return { shouldAdvance: false };
    if (state.phase !== GamePhase.DRAWING) return { shouldAdvance: false };
    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.DRAWING) {
      return { shouldAdvance: false };
    }

    const ctxEntity = DrawingPhaseContextEntity.from(state.phaseContext);

    const removed = ctxEntity.removeUser(userId);
    if (!removed) return { shouldAdvance: false };

    const patched = await this.gameStateStore.patch(roomId, {
      phaseContext: ctxEntity.toPlain(),
    });
    if (!patched) return { shouldAdvance: false };

    const shouldAdvance = ctxEntity.shouldAdvance();

    if (shouldAdvance) {
      const round = state.currentRound ?? 1;
      const activeUserIds = ctxEntity.getActiveUserIds();

      await this.commitAllActiveUsersToDb({
        roomId,
        round,
        state,
        activeUserIds,
      });

      await this.drawingStore.cleanupStrokes({
        roomId,
        round,
        userIds: activeUserIds,
      });
    }

    return {
      shouldAdvance,
      playerUpdate: { userId, changes: { isConnected: false } },
    };
  }

  // 타이머 종료 등 강제 전환 시점 커밋
  async forceCommitForEvaluating(params: {
    roomId: number;
    round: number;
    state: GameState;
  }): Promise<void> {
    const { roomId, round, state } = params;

    if (state.phase !== GamePhase.DRAWING) return;
    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.DRAWING) return;

    const ctxEntity = DrawingPhaseContextEntity.from(state.phaseContext);
    const activeUserIds = ctxEntity.getActiveUserIds();

    if (!activeUserIds.length) return;

    await this.commitAllActiveUsersToDb({
      roomId,
      round,
      state,
      activeUserIds,
    });

    await this.drawingStore.cleanupStrokes({
      roomId,
      round,
      userIds: activeUserIds,
    });
  }

  // DB에서 유저별 DrawData 조회
  async getDrawingsByUserIdForEvaluating(params: {
    roomId: number;
    round: number;
    state: GameState;
  }): Promise<Record<number, DrawData>> {
    const { round, state } = params;

    const matchId = state.matchId;
    if (typeof matchId !== 'number') throw new ConflictException(DRAWING_ERRORS.MATCH_ID_MISSING);

    const roomMemberMap = state.roomMemberIdByUserId;
    if (!roomMemberMap) throw new ConflictException(DRAWING_ERRORS.ROOM_MEMBER_MAP_MISSING);

    const userIdByRoomMemberId = new Map<number, number>();
    for (const [userIdStr, rmId] of Object.entries(roomMemberMap)) {
      const userId = Number(userIdStr);
      const roomMemberId = typeof rmId === 'number' ? rmId : Number(rmId);
      if (Number.isFinite(userId) && Number.isFinite(roomMemberId)) {
        userIdByRoomMemberId.set(roomMemberId, userId);
      }
    }

    const rows = await this.drawingRepository.findManyByMatchIdAndRound({ matchId, round });

    const out: Record<number, DrawData> = {};
    for (const row of rows) {
      const userId = userIdByRoomMemberId.get(row.roomMemberId);
      if (!userId) continue;
      out[userId] = row.data as unknown as DrawData;
    }

    return out;
  }

  // 활성 유저들의 strokes를 DB로 upsert
  private async commitAllActiveUsersToDb(params: {
    roomId: number;
    round: number;
    state: GameState;
    activeUserIds: number[];
  }): Promise<void> {
    const { roomId, round, state, activeUserIds } = params;

    const matchId = state.matchId;
    if (typeof matchId !== 'number') throw new ConflictException(DRAWING_ERRORS.MATCH_ID_MISSING);

    const roomMemberMap = state.roomMemberIdByUserId;
    if (!roomMemberMap) throw new ConflictException(DRAWING_ERRORS.ROOM_MEMBER_MAP_MISSING);

    const getRoomMemberId = (uid: number) => {
      const v = roomMemberMap[uid];
      const num = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(num)) throw new ConflictException(DRAWING_ERRORS.ROOM_MEMBER_ID_MISSING);
      return num;
    };

    const rows: Array<{
      matchId: number;
      roomMemberId: number;
      round: number;
      data: Prisma.InputJsonValue;
    }> = [];

    for (const uid of activeUserIds) {
      const roomMemberId = getRoomMemberId(uid);

      const lines = await this.drawingStore.loadStrokes({ roomId, round, userId: uid });

      const dataObj = { lines };
      const dataJson = dataObj as unknown as Prisma.InputJsonValue;

      rows.push({
        matchId,
        roomMemberId,
        round,
        data: dataJson,
      });
    }

    await this.drawingRepository.upsertManyDrawings(rows);
  }

  // DRAWING 단계/컨텍스트 검증
  private assertDrawing(state: GameState) {
    if (state.phase !== GamePhase.DRAWING) {
      throw new ConflictException(DRAWING_ERRORS.NOT_IN_DRAWING_PHASE);
    }
    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.DRAWING) {
      throw new ConflictException(DRAWING_ERRORS.DRAWING_CONTEXT_MISSING);
    }
  }
}
