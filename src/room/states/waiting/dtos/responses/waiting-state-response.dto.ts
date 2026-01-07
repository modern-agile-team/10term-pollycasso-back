import { RoomStatus, RoomMode, Team } from '@prisma/client';
import { PlayerResponseDto } from './player-response.dto';
import { PlayerPageStatus } from '../requests/update-status.dto';
import { ApiProperty } from '@nestjs/swagger';

export class WaitingStateResponseDto {
  @ApiProperty({ description: '방 상태', example: RoomStatus.WAITING, enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty({ description: '방장 ID', example: '1', nullable: true })
  hostId: string | null;

  @ApiProperty({ description: '페이즈 종료 시간 (타임스탬프)', example: null, nullable: true })
  endsAt: number | null;

  @ApiProperty({
    description: '방 설정',
    example: {
      roomTitle: '테스트용',
      gameMode: RoomMode.SOLO,
      maxPlayers: 6,
      isPrivate: true,
    },
  })
  settings: {
    roomTitle: string;
    gameMode: RoomMode;
    maxPlayers: number;
    isPrivate: boolean;
  };

  @ApiProperty({ description: '플레이어 목록', type: [PlayerResponseDto] })
  players: PlayerResponseDto[];

  @ApiProperty({ description: '현재 라운드', example: null, nullable: true })
  currentRound: number | null;

  @ApiProperty({ description: '전체 라운드', example: null, nullable: true })
  totalRounds: number | null;

  @ApiProperty({ description: '페이즈 컨텍스트', example: null, nullable: true })
  phaseContext: unknown;

  @ApiProperty({
    description: '팀 점수',
    example: null,
    nullable: true,
  })
  teamScore: {
    RED: number;
    BLUE: number;
  } | null;

  constructor(data: {
    status: RoomStatus;
    hostId: string | null;
    endsAt: number | null;
    settings: {
      roomTitle: string;
      gameMode: RoomMode;
      maxPlayers: number;
      isPrivate: boolean;
    };
    players: Array<{
      userId: number;
      nickname: string;
      team: Team;
      isReady: boolean;
      level: number;
      pageStatus?: PlayerPageStatus;
      outfit?: Record<string, unknown>;
    }>;
    currentRound?: number | null;
    totalRounds?: number | null;
    phaseContext?: unknown;
    teamScore?: { RED: number; BLUE: number } | null;
  }) {
    this.status = data.status;
    this.hostId = data.hostId;
    this.endsAt = data.endsAt;
    this.settings = data.settings;
    this.players = data.players.map((p) => new PlayerResponseDto(p));
    this.currentRound = data.currentRound ?? null;
    this.totalRounds = data.totalRounds ?? null;
    this.phaseContext = data.phaseContext ?? null;
    this.teamScore = data.teamScore ?? null;
  }
}
