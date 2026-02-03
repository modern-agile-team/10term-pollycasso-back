import { Outfit } from '../types/outfit.type';

const DEFAULT_OUTFIT: Outfit = {
  bird: 'bird_01',
  hat: null,
  accessory: null,
  top: null,
  bottom: null,
  shoes: null,
  effect: null,
};

export class OutfitVO {
  private constructor(private readonly value: Outfit) {}

  static from(raw: unknown): OutfitVO {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return new OutfitVO(DEFAULT_OUTFIT);
    }

    const obj = raw as Partial<Outfit>;

    return new OutfitVO({
      bird: typeof obj.bird === 'string' ? obj.bird : DEFAULT_OUTFIT.bird,
      hat: obj.hat ?? null,
      accessory: obj.accessory ?? null,
      top: obj.top ?? null,
      bottom: obj.bottom ?? null,
      shoes: obj.shoes ?? null,
      effect: obj.effect ?? null,
    });
  }

  get(): Outfit {
    return { ...this.value };
  }

  toJSON(): string {
    return JSON.stringify(this.value);
  }

  static fromJSON(json: string | undefined): OutfitVO {
    if (!json) {
      return OutfitVO.from(null);
    }

    try {
      return OutfitVO.from(JSON.parse(json));
    } catch {
      return OutfitVO.from(null);
    }
  }
}
