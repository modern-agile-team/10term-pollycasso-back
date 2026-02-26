import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { RankingRepository } from './ranking.repository';
import { RankingScheduler } from './ranking.scheduler';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [RankingController],
  providers: [RankingService, RankingRepository, RankingScheduler],
  exports: [RankingService],
})
export class RankingModule {}
