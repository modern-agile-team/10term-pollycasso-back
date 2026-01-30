import { Outfit } from '../../types/outfit.type';

export class OutfitDto {
  bird: string;
  hat: string | null;
  accessory: string | null;
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  effect: string | null;

  constructor(outfit: Outfit) {
    this.bird = outfit.bird;
    this.hat = outfit.hat;
    this.accessory = outfit.accessory;
    this.top = outfit.top;
    this.bottom = outfit.bottom;
    this.shoes = outfit.shoes;
    this.effect = outfit.effect;
  }
}
