import { Team } from '@prisma/client';
import { PlayerPageStatus } from '../requests/update-status.dto';
import { ApiProperty } from '@nestjs/swagger';

export class PlayerResponseDto {
  @ApiProperty({ description: '플레이어 ID', example: 1 })
  userId: number;

  @ApiProperty({ description: '플레이어 닉네임', example: '홍길동' })
  nickname: string;

  @ApiProperty({ description: '팀', example: Team.RED, enum: Team })
  team: Team;

  @ApiProperty({ description: '준비 상태', example: false })
  isReady: boolean;

  @ApiProperty({ description: '레벨', example: 10 })
  level: number;

  @ApiProperty({
    description: '페이지 상태',
    example: PlayerPageStatus.IDLE,
    enum: PlayerPageStatus,
  })
  status: PlayerPageStatus;

  @ApiProperty({
    description: '아웃핏 (코디)',
    example: { bird: 'bird_01', hat: 'hat_01' },
    required: false,
  })
  outfit?: Record<string, unknown>;

  constructor(data: {
    userId: number;
    nickname: string;
    team: Team;
    isReady: boolean;
    level: number;
    status?: PlayerPageStatus;
    outfit?: Record<string, unknown>;
  }) {
    this.userId = data.userId;
    this.nickname = data.nickname;
    this.team = data.team;
    this.isReady = data.isReady;
    this.level = data.level;
    this.status = data.status || PlayerPageStatus.IDLE;
    this.outfit = data.outfit;
  }
}
