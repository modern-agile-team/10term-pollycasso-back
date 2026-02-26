import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StatsPeriod } from '@prisma/client';

@Injectable()
export class RankingRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // 기간 내 matchResult (필요한 것만)
  findMatchResultsForPeriod(periodStart: Date, periodEnd: Date) {
    return this.prismaService.matchResult.findMany({
      where: {
        recordedAt: { gte: periodStart, lt: periodEnd },
        match: { status: 'COMPLETED' },
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

  // 스냅샷 시점 코인 Top4 유저 가져오기
  findCoinTop4UserProfiles() {
    return this.prismaService.userProfile.findMany({
      orderBy: [{ coin: 'desc' }, { level: 'desc' }, { userId: 'asc' }],
      take: 4,
      select: { userId: true, coin: true, level: true },
    });
  }

  // UserStats 덮어쓰기
  replaceSnapshot(period: StatsPeriod, periodStart: Date, insertData: any[]) {
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

  // 점수 Top4 조회
  findScoreTop4(period: StatsPeriod) {
    return this.prismaService.userStats.findMany({
      where: { period },
      orderBy: [{ totalScore: 'desc' }, { level: 'desc' }, { userId: 'asc' }],
      take: 4,
      select: {
        userId: true,
        totalScore: true,
        level: true,
        periodStart: true,
        user: { select: { id: true, username: true, nickname: true, tag: true } },
      },
    });
  }

  // 코인 Top4 조회
  findCoinTop4(period: StatsPeriod) {
    return this.prismaService.userStats.findMany({
      where: { period },
      orderBy: [{ coinBalance: 'desc' }, { level: 'desc' }, { userId: 'asc' }],
      take: 4,
      select: {
        userId: true,
        coinBalance: true,
        level: true,
        periodStart: true,
        user: { select: { id: true, username: true, nickname: true, tag: true } },
      },
    });
  }
}
