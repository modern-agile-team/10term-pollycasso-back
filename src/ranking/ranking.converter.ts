import { StatsPeriod } from '@prisma/client';
import type { LowerPeriod } from 'src/ranking/constants/ranking.constant';

export function toStatsPeriod(period: LowerPeriod): StatsPeriod {
  switch (period) {
    case 'daily':
      return StatsPeriod.DAILY;
    case 'weekly':
      return StatsPeriod.WEEKLY;
    case 'monthly':
      return StatsPeriod.MONTHLY;
  }
}
