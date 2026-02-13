import { Team } from '@prisma/client';
import { PlayerPageStatus } from '../requests/update-status.dto';
import { OutfitAssetPaths } from 'src/outfit/outfit.type';

export class PlayerResponseDto {
  userId: number;
  nickname: string;
  team: Team;
  isReady: boolean;
  level: number;
  status?: PlayerPageStatus;
  outfit?: OutfitAssetPaths;

  constructor(data: {
    userId: number;
    nickname: string;
    team: Team;
    isReady: boolean;
    level: number;
    status?: PlayerPageStatus;
    outfit?: OutfitAssetPaths;
  }) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.team = data.team;
    this.isReady = data.isReady;
    this.level = data.level;
    this.status = data.status;
    this.outfit = data.outfit;
  }
}
