import { Injectable } from '@nestjs/common';
import { MatchStatus, Prisma, StatsPeriod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RankingRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // 기간 내 matchResult 조회
  findMatchResults(params: { periodStart: Date; periodEnd: Date; status: MatchStatus }) {
    const { periodStart, periodEnd, status } = params;

    return this.prismaService.matchResult.findMany({
      where: {
        recordedAt: { gte: periodStart, lt: periodEnd },
        match: { status },
        score: { not: null },
      },
      select: {
        score: true,
        roomMember: {
          select: { userId: true },
        },
      },
    });
  }

  // 스냅샷 시점의 프로필(coin/level)을 유저별로 가져오기
  findUserProfilesByUserIds(userIds: number[]) {
    return this.prismaService.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, coin: true, level: true },
    });
  }

  // 프로필 조회
  findCoinUserProfiles(params: {
    take: number;
    orderBy: Prisma.UserProfileOrderByWithRelationInput[];
  }) {
    const { take, orderBy } = params;

    return this.prismaService.userProfile.findMany({
      orderBy,
      take,
      select: { userId: true, coin: true, level: true },
    });
  }

  // UserStats 덮어쓰기
  replaceSnapshot(
    period: StatsPeriod,
    periodStart: Date,
    insertData: Prisma.UserStatsCreateManyInput[],
  ) {
    return this.prismaService.$transaction(async (tx) => {
      await tx.userStats.deleteMany({
        where: { period, periodStart },
      });

      if (insertData.length > 0) {
        await tx.userStats.createMany({
          data: insertData,
        });
      }
    });
  }

  // 점수 랭킹 조회
  findScoreRankings(params: {
    period: StatsPeriod;
    take: number;
    orderBy: Prisma.UserStatsOrderByWithRelationInput[];
  }) {
    const { period, take, orderBy } = params;

    return this.prismaService.userStats.findMany({
      where: { period },
      orderBy,
      take,
      select: {
        userId: true,
        totalScore: true,
        level: true,
        periodStart: true,
        user: {
          select: { id: true, username: true, nickname: true, tag: true },
        },
      },
    });
  }

  // 코인 랭킹 조회
  findCoinRankings(params: {
    period: StatsPeriod;
    take: number;
    orderBy: Prisma.UserStatsOrderByWithRelationInput[];
  }) {
    const { period, take, orderBy } = params;

    return this.prismaService.userStats.findMany({
      where: { period },
      orderBy,
      take,
      select: {
        userId: true,
        coinBalance: true,
        level: true,
        periodStart: true,
        user: {
          select: { id: true, username: true, nickname: true, tag: true },
        },
      },
    });
  }
}
