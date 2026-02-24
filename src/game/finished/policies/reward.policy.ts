export type Reward = { exp: number; coin: number };

export function rewardByPlacement(placement?: number | null): Reward {
  if (!placement) return { exp: 0, coin: 0 };

  switch (placement) {
    case 1:
      return { exp: 120, coin: 80 };
    case 2:
      return { exp: 90, coin: 60 };
    case 3:
      return { exp: 70, coin: 45 };
    case 4:
      return { exp: 50, coin: 30 };
    case 5:
      return { exp: 40, coin: 25 };
    case 6:
      return { exp: 30, coin: 20 };
    default:
      return { exp: 30, coin: 20 };
  }
}
