import { Injectable } from '@nestjs/common';
import { MatchFinalizeService } from './match-finalize.service';
import { FinishedRepository } from './finished.repository';

type FinalResultItem = { userId: number; score: number; placement: number };
type FinalRewardsByUserId = Record<string, { exp: number; coin: number }>;

@Injectable()
export class MatchLifecycleService {
  constructor(
    private readonly repo: FinishedRepository,
    private readonly finalizeService: MatchFinalizeService,
  ) {}

  async onGameFinished(params: {
    roomId: number;
    matchId: number;
    finalResults: FinalResultItem[];
    roomMemberIdByUserId: Record<string, number>;
  }): Promise<FinalRewardsByUserId> {
    const { matchId, finalResults, roomMemberIdByUserId } = params;

    await this.repo.markMatchCompleted(matchId);

    return this.finalizeService.finalizeFromFinalResults({
      matchId,
      finalResults,
      roomMemberIdByUserId,
    });
  }
}
