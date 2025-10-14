import { Room as PrismaRoom } from '@prisma/client';
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
      prismaRoom.createdAt,
    );
  }

  static toPersistence(room: Room) {
    return {
      name: room.name,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      currentPlayers: room.currentPlayers,
      isPrivate: room.isPrivate,
      hashedPassword: room.getHashedPassword(),
    };
  }
}
