import { IsDefined, IsIn } from 'class-validator';
import { LOWER_PERIODS, type LowerPeriod } from 'src/ranking/constants/ranking.constant';

export class ScoreRankingQueryDto {
  @IsDefined()
  @IsIn(LOWER_PERIODS)
  period: LowerPeriod;
}

export class CoinRankingQueryDto {
  @IsDefined()
  @IsIn(LOWER_PERIODS)
  period: LowerPeriod;
}
