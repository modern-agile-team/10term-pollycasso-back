import { ApiProperty } from '@nestjs/swagger';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';

export enum FriendRelation {
  FRIEND = 'FRIEND',
  REQUEST_RECEIVED = 'REQUEST_RECEIVED',
  REQUEST_SENT = 'REQUEST_SENT',
  BLOCKED = 'BLOCKED',
}

export class FriendResponseDto {
  @ApiProperty({ description: '플레이어 ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '플레이어 닉네임', example: '홍길동' })
  nickname: string;

  @ApiProperty({ description: '아웃핏 정보', type: OutfitDto })
  outfit: OutfitDto;

  @ApiProperty({ description: '레벨', example: 10 })
  level: number;

  @ApiProperty({ description: '온라인 상태', example: true })
  isOnline: boolean;

  @ApiProperty({ description: '친구 관계', enum: FriendRelation })
  relation: FriendRelation;

  constructor(data: {
    userId: number;
    nickname: string;
    outfit: OutfitDto;
    level: number;
    isOnline: boolean;
    relation: FriendRelation;
  }) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.outfit = data.outfit;
    this.level = data.level;
    this.isOnline = data.isOnline;
    this.relation = data.relation;
  }
}
