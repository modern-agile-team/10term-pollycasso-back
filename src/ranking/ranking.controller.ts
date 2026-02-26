import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { RankingDto } from './dtos/requests/ranking-request.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

@Controller('ranking')
@UseGuards(AccessTokenGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('score')
  score(@Query() query: RankingDto) {
    return this.rankingService.getScoreTop4(query.periodEnum);
  }

  @Get('coin')
  coin(@Query() query: RankingDto) {
    return this.rankingService.getCoinTop4(query.periodEnum);
  }

  // 수동으로 스냅샷 갱신 (테스트용)
  @Post('snapshot/run')
  async runOnce() {
    return this.rankingService.runSnapshotJobOnce();
  }
}
