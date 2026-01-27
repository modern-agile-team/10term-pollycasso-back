import { Injectable } from '@nestjs/common';
import { Prisma, MatchStatus, Role, Team, RoomStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type { WaitingPlayerState } from './waiting.store';
import { WAITING_DOMAIN_ERROR_META } from './constants/waiting.constant';

export class RoomNotFoundError extends Error {
  constructor(roomId: number) {
    super(WAITING_DOMAIN_ERROR_META.ROOM_NOT_FOUND.message(roomId));
    this.name = WAITING_DOMAIN_ERROR_META.ROOM_NOT_FOUND.name;
  }
}

export class RoomAlreadyStartedError extends Error {
  constructor(roomId: number) {
    super(WAITING_DOMAIN_ERROR_META.GAME_ALREADY_STARTED.message(roomId));
    this.name = WAITING_DOMAIN_ERROR_META.GAME_ALREADY_STARTED.name;
  }
}

export class NoPlayersToStartError extends Error {
  constructor() {
    super(WAITING_DOMAIN_ERROR_META.GAME_START_NOT_ENOUGH_PLAYERS.message());
    this.name = WAITING_DOMAIN_ERROR_META.GAME_START_NOT_ENOUGH_PLAYERS.name;
  }
}

export interface GameSessionResult {
  matchId: number;
  roomMemberIdByUserId: Record<number, number>;
}

@Injectable()
export class WaitingRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 게임 시작 DB 트랜잭션
   * 1) Room 상태를 원자적으로 WAITING -> IN_PROGRESS 전환
   * 2) RoomMember upsert (순차 처리)
   * 3) userId -> roomMemberId 매핑 생성
   * 4) 첫 Match 생성
   */
  async startGameTx(params: {
    roomId: number;
    hostUserId: number;
    players: WaitingPlayerState[];
  }): Promise<GameSessionResult> {
    const { roomId, hostUserId, players } = params;

    if (!players.length) {
      throw new NoPlayersToStartError();
    }

    return this.prisma.$transaction(async (tx) => {
      await this.markRoomInProgressAtomic(tx, roomId);

      const savedMembers = await this.syncRoomMembersSequential(tx, {
        roomId,
        hostUserId,
        players,
      });

      const roomMemberIdByUserId = this.buildMemberMap(savedMembers, players);

      const matchId = await this.createInitialMatch(tx, roomId);

      return { matchId, roomMemberIdByUserId };
    });
  }

  private async markRoomInProgressAtomic(
    tx: Prisma.TransactionClient,
    roomId: number,
  ): Promise<void> {
    const updated = await tx.room.updateMany({
      where: { id: roomId, status: RoomStatus.WAITING },
      data: { status: RoomStatus.IN_PROGRESS, startedAt: new Date() },
    });

    if (updated.count === 0) {
      const room = await tx.room.findUnique({
        where: { id: roomId },
        select: { id: true },
      });

      if (!room) throw new RoomNotFoundError(roomId);
      throw new RoomAlreadyStartedError(roomId);
    }
  }

  private async syncRoomMembersSequential(
    tx: Prisma.TransactionClient,
    params: { roomId: number; hostUserId: number; players: WaitingPlayerState[] },
  ): Promise<Array<{ id: number; userId: number }>> {
    const { roomId, hostUserId, players } = params;
    const savedMembers: Array<{ id: number; userId: number }> = [];

    for (const player of players) {
      const role = player.userId === hostUserId ? Role.HOST : Role.PLAYER;
      const outfit = this.parseOutfit(player.outfit);

      const member = await tx.roomMember.upsert({
        where: { roomId_userId: { roomId, userId: player.userId } },
        create: {
          roomId,
          userId: player.userId,
          userNickname: player.nickname,
          userLevel: player.level,
          role,
          team: player.team ?? Team.NONE,
          isReady: !!player.isReady,
          outfit,
          leftAt: null,
        },
        update: {
          userNickname: player.nickname,
          userLevel: player.level,
          role,
          team: player.team ?? Team.NONE,
          isReady: !!player.isReady,
          outfit,
          leftAt: null,
        },
        select: { id: true, userId: true },
      });

      savedMembers.push(member);
    }

    return savedMembers;
  }

  private buildMemberMap(
    savedMembers: Array<{ id: number; userId: number }>,
    players: WaitingPlayerState[],
  ): Record<number, number> {
    const map: Record<number, number> = {};

    for (const member of savedMembers) {
      map[member.userId] = member.id;
    }

    for (const player of players) {
      if (!map[player.userId]) {
        throw new Error(`RoomMember mapping missing for userId=${player.userId}`);
      }
    }

    return map;
  }

  private async createInitialMatch(tx: Prisma.TransactionClient, roomId: number): Promise<number> {
    const match = await tx.match.create({
      data: {
        roomId,
        status: MatchStatus.LOADING,
        topic: null,
        topicWriterId: null,
      },
      select: { id: true },
    });
    return match.id;
  }

  private parseOutfit(outfit: unknown): Prisma.InputJsonValue | undefined {
    if (!outfit) return undefined;

    if (typeof outfit === 'string') {
      const trimmed = outfit.trim();
      if (!trimmed) return undefined;

      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed as Prisma.InputJsonValue;
        }

        return undefined;
      } catch {
        return undefined;
      }
    }

    if (typeof outfit === 'object' && outfit !== null) {
      return outfit as Prisma.InputJsonValue;
    }

    return undefined;
  }
}
