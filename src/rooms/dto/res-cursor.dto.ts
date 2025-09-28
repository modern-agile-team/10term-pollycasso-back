import { Room } from '@prisma/client';
import { ResRoomDto } from './res-room.dto';

export class ResCursorDto {
  readonly rooms: ResRoomDto[];
  readonly nextCursor: number | null;
  readonly hasNextData: boolean;

  constructor(rooms: ResRoomDto[], nextCursor: number | null, hasNextData: boolean) {
    this.rooms = rooms;
    this.nextCursor = nextCursor;
    this.hasNextData = hasNextData;
  }

  static fromEntities(rooms: Room[], nextCursor: number | null, hasNextData: boolean) {
    const roomDtos = ResRoomDto.transformRoomEntitiesToDto(rooms);
    return new ResCursorDto(roomDtos, nextCursor, hasNextData);
  }
}
