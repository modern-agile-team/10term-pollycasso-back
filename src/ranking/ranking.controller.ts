import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { RankingService } from './ranking.service';
import { ScoreRankingQueryDto, CoinRankingQueryDto } from './dtos/requests/ranking-request.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { toStatsPeriod } from './ranking.converter';
import { NonProductionGuard } from './guards/non-production.guard';

@Controller('ranking')
@UseGuards(AccessTokenGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get('scores')
  score(@Query() query: ScoreRankingQueryDto) {
    return this.rankingService.getScoreTop4(toStatsPeriod(query.period));
  }

  @Get('coins')
  coin(@Query() query: CoinRankingQueryDto) {
    return this.rankingService.getCoinTop4(toStatsPeriod(query.period));
  }

  // 수동으로 스냅샷 갱신 (테스트용)
  @Post('snapshot/run')
  @UseGuards(NonProductionGuard)
  async runOnce() {
    return this.rankingService.runSnapshotJobOnce();
  }
}
