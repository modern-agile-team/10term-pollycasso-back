export const LOWER_PERIODS = ['daily', 'weekly', 'monthly'] as const;
export type LowerPeriod = (typeof LOWER_PERIODS)[number];
export const RANKING_ERRORS = {
  NON_PRODUCTION_ENDPOINT_BLOCKED: 'NON_PRODUCTION_ENDPOINT_BLOCKED',
};
