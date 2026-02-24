export type Reward = { xp: number; coin: number };

export function rewardByPlacement(placement?: number | null): Reward {
  if (!placement) return { xp: 0, coin: 0 };

  switch (placement) {
    case 1:
      return { xp: 120, coin: 80 };
    case 2:
      return { xp: 90, coin: 60 };
    case 3:
      return { xp: 70, coin: 45 };
    default:
      return { xp: 40, coin: 25 };
  }
}
