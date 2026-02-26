import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RankingService } from './ranking.service';

@Injectable()
export class RankingScheduler {
  constructor(private readonly rankingService: RankingService) {}

  @Cron('0 * * * *', { timeZone: 'Asia/Seoul' })
  async handleHourlySnapshot() {
    await this.rankingService.runSnapshotJobOnce();
  }
}
