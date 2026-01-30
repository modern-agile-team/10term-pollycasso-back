import { Outfit } from '../types/outfit.type';

export function parseOutfit(data: unknown): Outfit {
  if (!data || typeof data !== 'object') {
    return {
      bird: 'bird_01',
      hat: null,
      accessory: null,
      top: null,
      bottom: null,
      shoes: null,
      effect: null,
    };
  }

  const obj = data as Partial<Outfit>;

  return {
    bird: typeof obj.bird === 'string' ? obj.bird : 'bird_01',
    hat: typeof obj.hat === 'string' ? obj.hat : null,
    accessory: typeof obj.accessory === 'string' ? obj.accessory : null,
    top: typeof obj.top === 'string' ? obj.top : null,
    bottom: typeof obj.bottom === 'string' ? obj.bottom : null,
    shoes: typeof obj.shoes === 'string' ? obj.shoes : null,
    effect: typeof obj.effect === 'string' ? obj.effect : null,
  };
}
