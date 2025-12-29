import { Prisma, Room as PrismaRoom } from '@prisma/client';
import { Room, RoomProps } from '../room.entity';

export class RoomMapper {
  static toEntity(prismaRoom: PrismaRoom): Room {
    const props: RoomProps = {
      name: prismaRoom.name,
      mode: prismaRoom.mode,
      maxPlayers: prismaRoom.maxPlayers,
      isPrivate: prismaRoom.isPrivate,
      hashedPassword: prismaRoom.hashedPassword,
      status: prismaRoom.status,
    };

    return Room.load(prismaRoom.id, props);
  }

  static toPersistence(room: Room): Prisma.RoomCreateInput {
    return {
      name: room.name,
      mode: room.mode,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      hashedPassword: room.hashedPassword ?? undefined,
      status: room.status,
    };
  }
}
