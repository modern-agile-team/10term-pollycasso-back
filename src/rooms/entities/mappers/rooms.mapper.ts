import { Prisma, Room as PrismaRoom } from '@prisma/client';
import { Room } from '../rooms.entity';

export class RoomMapper {
  static toEntity(prismaRoom: PrismaRoom): Room {
    return Room.load(
      prismaRoom.id,
      prismaRoom.name,
      prismaRoom.mode,
      prismaRoom.maxPlayers,
      prismaRoom.currentPlayers,
      prismaRoom.isPrivate,
      prismaRoom.hashedPassword,
      prismaRoom.status,
    );
  }

  static toPersistence(room: Room): Prisma.RoomCreateInput {
    return {
      name: room.name,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      hashedPassword: room.hashedPassword,
    };
  }
}
