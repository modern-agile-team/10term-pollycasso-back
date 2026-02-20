import { OutfitAssetPaths } from 'src/outfit/outfit.type';

export class LoginResponseDto {
  accessToken: string;
  tag: string;
  coins: number;
  level: number;
  currentExp: number;
  outfit: OutfitAssetPaths;
}
