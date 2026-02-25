export type Reward = { exp: number; coin: number };

const REWARD_TABLE: Record<number, Reward> = {
  1: { exp: 120, coin: 80 },
  2: { exp: 90, coin: 60 },
  3: { exp: 70, coin: 45 },
  4: { exp: 50, coin: 30 },
  5: { exp: 40, coin: 25 },
  6: { exp: 30, coin: 20 },
};

export function rewardByPlacement(placement: number | undefined): Reward {
  if (placement === undefined) {
    return { exp: 0, coin: 0 };
  }

  return REWARD_TABLE[placement] ?? { exp: 30, coin: 20 };
}
