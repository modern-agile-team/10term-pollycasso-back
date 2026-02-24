import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { rewardByPlacement } from './policies/reward.policy';
import { FINISHED_EVENTS } from './constants/finished.constant';
import { FinishedRepository } from './finished.repository';
import { MatchFinalizeParams, RewardsGrantedEventPayload } from './interfaces/finished.interface';
import { FinalRewardsByUserId } from './types/finished.type';

@Injectable()
export class MatchFinalizeService {
  constructor(
    private readonly finishedRepository: FinishedRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async finalizeFromFinalResults(params: MatchFinalizeParams): Promise<FinalRewardsByUserId> {
    const { matchId, finalResults, roomMemberIdByUserId } = params;

    const finalRewards: FinalRewardsByUserId = {};
    for (const result of finalResults) {
      const { exp, coin } = rewardByPlacement(result.placement || 9999);
      finalRewards[String(result.userId)] = { exp, coin };
    }

    const notifications = await this.finishedRepository.transaction(async (tx) => {
      const eventPayloads: RewardsGrantedEventPayload[] = [];

      for (const userResult of finalResults) {
        const userId = Number(userResult.userId);
        const memberId = roomMemberIdByUserId[String(userId)];
        if (!memberId) continue;

        const score = Number(userResult.score ?? 0);
        const placement = Number(userResult.placement ?? 0) || 0;

        const upserted = await this.finishedRepository.upsertMatchResult(tx, {
          matchId,
          roomMemberId: memberId,
          score,
          placement,
        });

        if (upserted.rewardedAt != null) continue;

        const { exp, coin } = rewardByPlacement(placement || 9999);

        const updated = await this.finishedRepository.confirmRewardOnce(tx, {
          matchResultId: upserted.id,
          exp,
          coin,
        });

        if (updated.count !== 1) continue;

        await this.finishedRepository.incrementUserProfile(tx, { userId, exp, coin });

        eventPayloads.push({ userId, matchId, exp, coin, placement });
      }

      return eventPayloads;
    });

    for (const payload of notifications) {
      this.eventEmitter.emit(FINISHED_EVENTS.REWARDS_GRANTED, payload);
    }

    return finalRewards;
  }
}
