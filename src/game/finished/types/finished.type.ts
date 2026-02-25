export type FinalResultItem = {
  userId: number;
  score: number;
  placement: number;
};

export type FinalRewardsByUserId = Record<number, { exp: number; coin: number }>;
