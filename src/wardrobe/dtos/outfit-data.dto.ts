import { OutfitIds } from 'src/outfit/outfit.type';

export class OutfitDataDto {
  bird: number;
  hat: number | null;
  accessory: number | null;
  top: number | null;
  bottom: number | null;
  shoes: number | null;
  effect: number | null;

  constructor(outfit: OutfitIds) {
    this.bird = outfit.bird;
    this.hat = outfit.hat;
    this.accessory = outfit.accessory;
    this.top = outfit.top;
    this.bottom = outfit.bottom;
    this.shoes = outfit.shoes;
    this.effect = outfit.effect;
  }
}
