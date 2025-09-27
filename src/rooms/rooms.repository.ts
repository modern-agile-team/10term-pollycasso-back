import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RoomInterface, RoomQueryInterface } from './rooms.interface';
import { Prisma, Room, RoomMode, RoomStatus } from '@prisma/client';

@Injectable()
export class RoomsRepository {
  private readonly ITEMS_PER_PAGE = 6;

  constructor(private readonly prisma: PrismaService) {}

  create(data: RoomInterface): Promise<Room> {
    return this.prisma.room.create({ data });
  }

  async findAll(query: RoomQueryInterface) {
    const { name, mode, status, cursor } = query;
    const where: Prisma.RoomWhereInput = { deletedAt: null };

    if (name) where.name = { contains: name };
    if (mode) where.mode = mode as RoomMode;
    if (status) where.status = status as RoomStatus;

    const rooms = await this.prisma.room.findMany({
      where,
      orderBy: { id: 'desc' },
      take: this.ITEMS_PER_PAGE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasNextData = rooms.length > this.ITEMS_PER_PAGE;
    const data = hasNextData ? rooms.slice(0, this.ITEMS_PER_PAGE) : rooms;
    const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

    return { data, hasNextData, nextCursor: hasNextData ? nextCursor : null };
  }

  findOne(id: number): Promise<Room | null> {
    return this.prisma.room.findFirst({ where: { id, deletedAt: null } });
  }

  update(id: number, data: RoomInterface): Promise<Room> {
    return this.prisma.room.update({ where: { id }, data });
  }

  softDelete(id: number): Promise<Room> {
    return this.prisma.room.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
