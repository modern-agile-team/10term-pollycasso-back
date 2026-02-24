import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { rewardByPlacement } from './policies/reward.policy';
import { FINISHED_EVENTS } from './constants/finished.constant';
import { FinishedRepository } from './finished.repository';

type FinalResultItem = { userId: number; score: number; placement: number };
type FinalRewardsByUserId = Record<string, { exp: number; coin: number }>;

@Injectable()
export class MatchFinalizeService {
  constructor(
    private readonly repo: FinishedRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async finalizeFromFinalResults(params: {
    matchId: number;
    finalResults: FinalResultItem[];
    roomMemberIdByUserId: Record<string, number>;
  }): Promise<FinalRewardsByUserId> {
    const { matchId, finalResults, roomMemberIdByUserId } = params;

    // 브로드캐스트용: 전원 보상표(정책 기반)
    const finalRewards: FinalRewardsByUserId = {};
    for (const r of finalResults) {
      const { xp, coin } = rewardByPlacement(r.placement || 9999);
      finalRewards[String(r.userId)] = { exp: xp, coin };
    }

    // 커밋 후 유니캐스트 emit 목록
    const notifications = await this.repo.transaction(async (tx) => {
      const noti: Array<{
        userId: number;
        matchId: number;
        exp: number;
        coin: number;
        placement: number;
      }> = [];

      for (const item of finalResults) {
        const userId = Number(item.userId);
        const memberId = roomMemberIdByUserId[String(userId)];
        if (!memberId) continue;

        const score = Number(item.score ?? 0);
        const placement = Number(item.placement ?? 0) || 0;

        const upserted = await this.repo.upsertMatchResult(tx, {
          matchId,
          roomMemberId: memberId,
          score,
          placement,
        });

        // 이미 지급했으면 스킵
        if (upserted.rewardedAt != null) continue;

        const { xp, coin } = rewardByPlacement(placement || 9999);

        const updated = await this.repo.confirmRewardOnce(tx, {
          matchResultId: upserted.id,
          xp,
          coin,
        });

        if (updated.count !== 1) continue;

        await this.repo.incrementUserProfile(tx, { userId, xp, coin });

        noti.push({ userId, matchId, exp: xp, coin, placement });
      }

      return noti;
    });

    // 커밋 후 유니캐스트 이벤트
    for (const n of notifications) {
      this.eventEmitter.emit(FINISHED_EVENTS.REWARDS_GRANTED, n);
    }

    // 브로드캐스트용 리턴
    return finalRewards;
  }
}
