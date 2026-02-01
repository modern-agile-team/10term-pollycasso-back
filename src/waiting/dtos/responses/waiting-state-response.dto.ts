import { RoomStatus, RoomMode, Team } from '@prisma/client';
import { PlayerResponseDto } from './player-response.dto';
import { PlayerPageStatus } from '../requests/update-status.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Outfit } from 'src/common/types/outfit.type';

export class WaitingStateResponseDto {
  @ApiProperty({ description: '방 상태', example: RoomStatus.WAITING, enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty({ description: '방장 ID', example: '1', nullable: true })
  hostId: string | null;

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

  constructor(data: {
    status: RoomStatus;
    hostId: string | null;
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
      status?: PlayerPageStatus;
      outfit?: Outfit;
    }>;
  }) {
    this.status = data.status;
    this.hostId = data.hostId;
    this.settings = data.settings;
    this.players = data.players.map((p) => new PlayerResponseDto(p));
  }
}
