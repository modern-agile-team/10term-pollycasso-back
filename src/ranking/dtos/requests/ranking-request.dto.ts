import { IsDefined, IsIn } from 'class-validator';
import { StatsPeriod } from '@prisma/client';

const LOWER_PERIODS = ['daily', 'weekly', 'monthly'] as const;
type LowerPeriod = (typeof LOWER_PERIODS)[number];

export class RankingDto {
  @IsDefined()
  @IsIn(LOWER_PERIODS)
  period: LowerPeriod;

  get periodEnum(): StatsPeriod {
    switch (this.period) {
      case 'daily':
        return StatsPeriod.DAILY;
      case 'weekly':
        return StatsPeriod.WEEKLY;
      case 'monthly':
        return StatsPeriod.MONTHLY;
    }
  }
}
