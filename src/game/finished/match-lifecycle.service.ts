import { Injectable } from '@nestjs/common';
import { MatchFinalizeService } from './match-finalize.service';
import { FinishedRepository } from './finished.repository';
import { FinalRewardsByUserId } from './types/finished.type';
import { MatchLifecycleParams } from './interfaces/finished.interface';

@Injectable()
export class MatchLifecycleService {
  constructor(
    private readonly finishedRepository: FinishedRepository,
    private readonly finalizeService: MatchFinalizeService,
  ) {}

  // 매치 종료 처리: 결과 저장, 보상 계산 및 지급
  async onGameFinished(params: MatchLifecycleParams): Promise<FinalRewardsByUserId> {
    const { matchId, finalResults, roomMemberIdByUserId } = params;

    await this.finishedRepository.markMatchCompleted(matchId);

    return this.finalizeService.finalizeFromFinalResults({
      matchId,
      finalResults,
      roomMemberIdByUserId,
    });
  }
}
