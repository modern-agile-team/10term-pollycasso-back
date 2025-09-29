import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Room as PrismaRoom } from '@prisma/client';
import { CreateRoomInput, FindRoomsQuery, UpdateRoomInput } from './rooms.interface';

@Injectable()
export class RoomsRepository {
  private readonly ITEMS_PER_PAGE = 6;

  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRoomInput): Promise<PrismaRoom> {
    return this.prisma.room.create({ data: input });
  }

  async findAll(query: FindRoomsQuery) {
    const { name, mode, isPrivate, status, cursor } = query;
    const where: Prisma.RoomWhereInput = { deletedAt: null };

    if (name) where.name = { contains: name };
    if (mode) where.mode = mode;
    if (isPrivate !== undefined) where.isPrivate = isPrivate;
    if (status) where.status = status;

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

  findOne(id: number): Promise<PrismaRoom | null> {
    return this.prisma.room.findFirst({ where: { id, deletedAt: null } });
  }

  update(id: number, input: UpdateRoomInput): Promise<PrismaRoom> {
    return this.prisma.room.update({ where: { id }, data: input });
  }

  softDelete(id: number): Promise<PrismaRoom> {
    return this.prisma.room.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
