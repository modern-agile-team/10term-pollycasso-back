import { Injectable } from '@nestjs/common';
import { StatsPeriod } from '@prisma/client';
import { RankingRepository } from './ranking.repository';
import { dayjsKst } from './utils/dayjs.util';

@Injectable()
export class RankingService {
  constructor(private readonly rankingRepository: RankingRepository) {}

  // 배치: period별 스냅샷 갱신(최신 1개로 덮어쓰기)
  async rebuildSnapshot(period: StatsPeriod) {
    const { periodStart, periodEnd } = this.getBounds(period);

    // 점수 집계
    const matchResults = await this.rankingRepository.findMatchResultsForPeriod(
      periodStart,
      periodEnd,
    );
    const scoreMap = new Map<number, number>();
    for (const r of matchResults) {
      const userId = r.roomMember.userId;
      scoreMap.set(userId, (scoreMap.get(userId) ?? 0) + (r.score ?? 0));
    }

    // userIds의 level을 가져와서 동점 규칙까지 반영
    const scoreUserIds = Array.from(scoreMap.keys());
    const scoreProfiles =
      scoreUserIds.length > 0
        ? await this.rankingRepository.findUserProfilesByUserIds(scoreUserIds)
        : [];
    const levelMap = new Map(scoreProfiles.map((p) => [p.userId, p.level]));

    const scoreTop4UserIds = scoreUserIds
      .map((userId) => ({
        userId,
        totalScore: scoreMap.get(userId) ?? 0,
        level: levelMap.get(userId) ?? 1,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.level !== a.level) return b.level - a.level;
        return a.userId - b.userId;
      })
      .slice(0, 4)
      .map((x) => x.userId);

    const coinTop4Profiles = await this.rankingRepository.findCoinTop4UserProfiles();
    const coinTop4Ids = coinTop4Profiles.map((p) => p.userId);

    const targetIds = Array.from(new Set([...scoreTop4UserIds, ...coinTop4Ids]));

    // coin/level 조회
    const profiles =
      targetIds.length > 0 ? await this.rankingRepository.findUserProfilesByUserIds(targetIds) : [];
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));

    const insertData = targetIds.map((userId) => {
      const prof = profileMap.get(userId) ?? { coin: 0, level: 1 };
      return {
        userId,
        period,
        periodStart,
        periodEnd,
        totalScore: scoreMap.get(userId) ?? 0,
        coinBalance: prof.coin,
        level: prof.level,
        rank: null,
      };
    });

    await this.rankingRepository.replaceSnapshot(period, periodStart, insertData);

    return { period, periodStart, updatedUsers: insertData.length };
  }

  // 스냅샷 갱신 (수동 실행용)
  async runSnapshotJobOnce() {
    const daily = await this.rebuildSnapshot(StatsPeriod.DAILY);
    const weekly = await this.rebuildSnapshot(StatsPeriod.WEEKLY);
    const monthly = await this.rebuildSnapshot(StatsPeriod.MONTHLY);
    return { daily, weekly, monthly };
  }

  // 점수 Top4 조회
  async getScoreTop4(period: StatsPeriod) {
    const rows = await this.rankingRepository.findScoreTop4(period);
    return rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.user.id,
      nickname: `${r.user.nickname}${r.user.tag ? `#${r.user.tag}` : ''}`,
      username: r.user.username,
      level: r.level,
      totalScore: r.totalScore,
      periodStart: r.periodStart,
    }));
  }

  // 코인 Top4 조회
  async getCoinTop4(period: StatsPeriod) {
    const rows = await this.rankingRepository.findCoinTop4(period);
    return rows.map((r, idx) => ({
      rank: idx + 1,
      userId: r.user.id,
      nickname: `${r.user.nickname}${r.user.tag ? `#${r.user.tag}` : ''}`,
      username: r.user.username,
      level: r.level,
      coinBalance: r.coinBalance,
      periodStart: r.periodStart,
    }));
  }

  // 랭킹 조회를 위한 KST 기준 시간 구하기
  private getBounds(period: StatsPeriod) {
    const now = dayjsKst();

    if (period === StatsPeriod.DAILY) {
      const periodStart = now.startOf('day');
      const periodEnd = periodStart.add(1, 'day');
      return { periodStart: periodStart.toDate(), periodEnd: periodEnd.toDate() };
    }

    if (period === StatsPeriod.WEEKLY) {
      const periodStart = now.startOf('isoWeek');
      const periodEnd = periodStart.add(1, 'week');
      return { periodStart: periodStart.toDate(), periodEnd: periodEnd.toDate() };
    }

    const periodStart = now.startOf('month');
    const periodEnd = periodStart.add(1, 'month');
    return { periodStart: periodStart.toDate(), periodEnd: periodEnd.toDate() };
  }
}
