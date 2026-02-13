import { DEFAULT_OUTFIT } from './constants/outfit.constant';
import { OutfitIds } from './outfit.type';

export class OutfitVO {
  private constructor(private readonly value: OutfitIds) {}

  static from(raw: unknown): OutfitVO {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return new OutfitVO(DEFAULT_OUTFIT);
    }

    const obj = raw as Partial<OutfitIds>;

    return new OutfitVO({
      bird: typeof obj.bird === 'number' ? obj.bird : DEFAULT_OUTFIT.bird,
      hat: (typeof obj.hat === 'number' ? obj.hat : null) ?? null,
      accessory: (typeof obj.accessory === 'number' ? obj.accessory : null) ?? null,
      top: (typeof obj.top === 'number' ? obj.top : null) ?? null,
      bottom: (typeof obj.bottom === 'number' ? obj.bottom : null) ?? null,
      shoes: (typeof obj.shoes === 'number' ? obj.shoes : null) ?? null,
      effect: (typeof obj.effect === 'number' ? obj.effect : null) ?? null,
    });
  }

  get(): OutfitIds {
    return { ...this.value };
  }

  toJSON(): string {
    return JSON.stringify(this.value);
  }

  static fromJSON(json: string | undefined): OutfitVO {
    if (!json) return OutfitVO.from(null);
    try {
      return OutfitVO.from(JSON.parse(json));
    } catch {
      return OutfitVO.from(null);
    }
  }
}
