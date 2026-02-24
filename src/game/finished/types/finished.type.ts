export type FinalResultItem = {
  userId: number;
  score: number;
  placement: number;
};

export type FinalRewardsByUserId = Record<string, { exp: number; coin: number }>;
