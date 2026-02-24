import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, RoomStatus, MatchStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FinishedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async markMatchCompleted(matchId: number, now = new Date()) {
    return this.prisma.match.updateMany({
      where: { id: matchId, status: { not: MatchStatus.COMPLETED } },
      data: { status: MatchStatus.COMPLETED, endedAt: now },
    });
  }

  async upsertMatchResult(
    tx: PrismaClient | Prisma.TransactionClient,
    params: { matchId: number; roomMemberId: number; score: number; placement: number },
  ) {
    const { matchId, roomMemberId, score, placement } = params;

    return tx.matchResult.upsert({
      where: { roomMemberId_matchId: { roomMemberId, matchId } },
      create: { matchId, roomMemberId, score, placement },
      update: { score, placement },
      select: { id: true, rewardedAt: true },
    });
  }

  async confirmRewardOnce(
    tx: PrismaClient | Prisma.TransactionClient,
    params: { matchResultId: number; xp: number; coin: number; now?: Date },
  ) {
    const { matchResultId, xp, coin, now = new Date() } = params;

    return tx.matchResult.updateMany({
      where: { id: matchResultId, rewardedAt: null },
      data: { awardedXp: xp, awardedCoin: coin, rewardedAt: now },
    });
  }

  async incrementUserProfile(
    tx: PrismaClient | Prisma.TransactionClient,
    params: { userId: number; xp: number; coin: number },
  ) {
    const { userId, xp, coin } = params;

    return tx.userProfile.update({
      where: { userId },
      data: {
        experience: { increment: xp },
        coin: { increment: coin },
      },
    });
  }

  async resetRoomToWaiting(roomId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.WAITING },
      });

      await tx.roomMember.updateMany({
        where: { roomId },
        data: { isReady: false },
      });
    });
  }

  async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.prisma.$transaction(fn);
  }
}
