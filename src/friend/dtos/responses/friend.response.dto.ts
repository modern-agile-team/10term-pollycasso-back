import { OutfitDto } from 'src/outfit/dtos/responses/outfit-response.dto';

export enum FriendRelation {
  FRIEND = 'FRIEND',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  REQUEST_SENT = 'REQUEST_SENT',
  BLOCKED = 'BLOCKED',
}

export class FriendResponseDto {
  userId: number;
  nickname: string;
  tag: string;
  outfit: OutfitDto;
  level: number;
  isOnline: boolean;
  relation: FriendRelation;

  constructor(data: {
    userId: number;
    nickname: string;
    tag: string;
    outfit: OutfitDto;
    level: number;
    isOnline: boolean;
    relation: FriendRelation;
  }) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.tag = data.tag;
    this.outfit = data.outfit;
    this.level = data.level;
    this.isOnline = data.isOnline;
    this.relation = data.relation;
  }
}
