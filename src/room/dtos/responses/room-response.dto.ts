import { RoomMode, RoomStatus } from '@prisma/client';
import { Room } from '../../entities/room.entity';
import { ApiProperty } from '@nestjs/swagger';

export class ResRoomDto {
  @ApiProperty({ description: '방 ID', example: 1 })
  readonly id: number;
  @ApiProperty({ description: '방 이름', example: '테스트용' })
  readonly name: string;
  @ApiProperty({ description: '방 모드', example: RoomMode.SOLO })
  readonly mode: RoomMode;
  @ApiProperty({ description: '방 최대 인원 수', example: 5 })
  readonly maxPlayers: number;
  @ApiProperty({ description: '방 현재 인원 수', example: 3 })
  readonly currentPlayers: number;
  @ApiProperty({ description: '방 비공개 여부', example: true })
  readonly isPrivate: boolean;
  @ApiProperty({ description: '방 상태', example: RoomStatus.IN_PROGRESS })
  readonly status: RoomStatus;

  constructor(room: Room) {
    this.id = room.id!;
    this.name = room.name;
    this.mode = room.mode;
    this.maxPlayers = room.maxPlayers;
    this.currentPlayers = room.currentPlayers;
    this.isPrivate = room.isPrivate;
    this.status = room.status;
  }
}
