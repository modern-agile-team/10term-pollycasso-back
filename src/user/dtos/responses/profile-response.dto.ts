import { OutfitAssetPaths } from 'src/outfit/outfit.type';

export class ProfileResponseDto {
  tag: string;
  coins: number;
  level: number;
  currentExp: number;
  outfit: OutfitAssetPaths;
}
