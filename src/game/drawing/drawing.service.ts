import { Inject, Injectable, ConflictException } from '@nestjs/common';
import type { DrawLine } from './interface/drawing.interface';
import {
  GAME_STATE_STORE,
  GamePhase,
  GameState,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import { RedisService } from 'src/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DrawingPhaseService {
  constructor(
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private strokeListKey(roomId: number, round: number, userId: number) {
    return `game:drawing:${roomId}:round:${round}:user:${userId}:strokes`;
  }

  private async getRedisClient(): Promise<any> {
    const client: any = (this.redis as any).client ?? (this.redis as any).getClient?.();
    if (!client) throw new ConflictException('REDIS_CLIENT_NOT_READY');
    return client;
  }

  private assertDrawing(state: GameState) {
    if (state.phase !== GamePhase.DRAWING) {
      throw new ConflictException('NOT_IN_DRAWING_PHASE');
    }
    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.DRAWING) {
      throw new ConflictException('DRAWING_CONTEXT_MISSING');
    }
  }

  private getDrawingContext(state: GameState) {
    this.assertDrawing(state);
    return state.phaseContext as any as {
      kind: GamePhase.DRAWING;
      activeUserIds: number[];
      readyUserIds: number[];
    };
  }

  // ===== 마우스 업마다 stroke(line) 1개 저장: Redis 누적만 =====
  async sendDrawingLine(params: { roomId: number; userId: number; line: DrawLine }): Promise<void> {
    const { roomId, userId, line } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state) throw new ConflictException('GAME_STATE_NOT_FOUND');
    this.assertDrawing(state);

    const ctx = this.getDrawingContext(state);
    if (!ctx.activeUserIds.includes(userId)) {
      console.error(`User Conflict: sender=${userId}, activeUsers=${ctx.activeUserIds}`);
      throw new ConflictException('USER_NOT_ACTIVE');
    }

    const round = state.currentRound ?? 1;
    await this.appendStroke(roomId, round, userId, line);
  }

  // ===== 완료 버튼: ready 처리만. 전원 ready면 DB(JSON) 저장 =====
  async submitDrawing(params: { roomId: number; userId: number }): Promise<{
    shouldAdvance: boolean;
    playerUpdate?: { userId: number; changes: { isReady: true } };
  }> {
    const { roomId, userId } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state) throw new ConflictException('GAME_STATE_NOT_FOUND');
    this.assertDrawing(state);

    const ctx = this.getDrawingContext(state);
    if (!ctx.activeUserIds.includes(userId)) {
      throw new ConflictException('USER_NOT_ACTIVE');
    }

    const wasReady = ctx.readyUserIds.includes(userId);
    if (!wasReady) ctx.readyUserIds.push(userId);

    const patched = await this.gameStateStore.patch(roomId, { phaseContext: ctx as any });
    if (!patched) throw new ConflictException('GAME_STATE_NOT_FOUND');

    const shouldAdvance = ctx.readyUserIds.length >= ctx.activeUserIds.length;

    if (shouldAdvance) {
      const round = state.currentRound ?? 1;
      await this.commitAllActiveUsersToDb(roomId, round, state, ctx.activeUserIds);
      await this.cleanupStrokes(roomId, round, ctx.activeUserIds);
    }

    return {
      shouldAdvance,
      playerUpdate: !wasReady ? { userId, changes: { isReady: true } } : undefined,
    };
  }

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

    const ctx = this.getDrawingContext(state);

    const wasActive = ctx.activeUserIds.includes(userId);
    if (!wasActive) return { shouldAdvance: false };

    ctx.activeUserIds = ctx.activeUserIds.filter((id) => id !== userId);
    ctx.readyUserIds = ctx.readyUserIds.filter((id) => id !== userId);

    const patched = await this.gameStateStore.patch(roomId, { phaseContext: ctx as any });
    if (!patched) return { shouldAdvance: false };

    const shouldAdvance =
      ctx.activeUserIds.length > 0 && ctx.readyUserIds.length >= ctx.activeUserIds.length;

    if (shouldAdvance) {
      const round = state.currentRound ?? 1;
      await this.commitAllActiveUsersToDb(roomId, round, state, ctx.activeUserIds);
      await this.cleanupStrokes(roomId, round, ctx.activeUserIds);
    }

    return {
      shouldAdvance,
      playerUpdate: { userId, changes: { isConnected: false } },
    };
  }

  // ===== Redis =====
  private async appendStroke(roomId: number, round: number, userId: number, line: DrawLine) {
    const client = await this.getRedisClient();
    const key = this.strokeListKey(roomId, round, userId);

    await client.rpush(key, JSON.stringify(line));
    await client.expire(key, 3600);
  }

  private async loadStrokes(roomId: number, round: number, userId: number): Promise<DrawLine[]> {
    const client = await this.getRedisClient();
    const key = this.strokeListKey(roomId, round, userId);

    const raw: string[] = (await client.lrange(key, 0, -1)) ?? [];
    const lines: DrawLine[] = raw
      .map((s) => {
        try {
          return JSON.parse(s) as DrawLine;
        } catch {
          return null;
        }
      })
      .filter((v): v is DrawLine => !!v);

    return lines;
  }

  private async cleanupStrokes(roomId: number, round: number, userIds: number[]) {
    const client = await this.getRedisClient();
    for (const uid of userIds) {
      await client.del(this.strokeListKey(roomId, round, uid));
    }
  }

  private async commitAllActiveUsersToDb(
    roomId: number,
    round: number,
    state: GameState,
    activeUserIds: number[],
  ) {
    const matchId = state.matchId;
    if (typeof matchId !== 'number') throw new ConflictException('MATCH_ID_MISSING');

    const roomMemberMap = (state as any).roomMemberIdByUserId as Record<string, number> | undefined;
    if (!roomMemberMap) throw new ConflictException('ROOM_MEMBER_MAP_MISSING');

    const getRoomMemberId = (uid: number) => {
      const v = roomMemberMap[String(uid)];
      const num = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(num)) throw new ConflictException('ROOM_MEMBER_ID_MISSING');
      return num;
    };

    await this.prisma.$transaction(async (tx) => {
      for (const uid of activeUserIds) {
        const roomMemberId = getRoomMemberId(uid);
        const lines = await this.loadStrokes(roomId, round, uid);

        const dataObj = { lines };

        const dataJson = JSON.parse(JSON.stringify(dataObj)) as unknown as Prisma.InputJsonValue;

        await tx.drawing.upsert({
          where: {
            matchId_roomMemberId_round: { matchId, roomMemberId, round },
          },
          create: {
            matchId,
            roomMemberId,
            round,
            data: dataJson,
          },
          update: {
            data: dataJson,
          },
        });
      }
    });
  }
}
