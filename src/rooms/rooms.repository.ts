import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Prisma, Room } from '@prisma/client';
import { QueryRoomDto } from './dto/query-room.dto';

@Injectable()
export class RoomsRepository {
  private readonly ITEMS_PER_PAGE = 6;

  constructor(private readonly prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    return this.prisma.room.create({ data: createRoomDto });
  }

  async findAll(
    query: QueryRoomDto,
  ): Promise<{ data: Room[]; hasNextData: boolean; nextCursor: number | null }> {
    const { name, mode, status, cursor } = query;

    const where: Prisma.RoomWhereInput = { deletedAt: null };
    if (name) where.name = { contains: name };
    if (mode) where.mode = mode;
    if (status) where.status = status;

    const rooms = await this.prisma.room.findMany({
      where,
      orderBy: { id: 'desc' },
      take: this.ITEMS_PER_PAGE + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasNextData = rooms.length > this.ITEMS_PER_PAGE;
    const data = hasNextData ? rooms.slice(0, this.ITEMS_PER_PAGE) : rooms;
    const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

    return {
      data,
      nextCursor: hasNextData ? nextCursor : null,
      hasNextData,
    };
  }

  async findOne(id: number): Promise<Room | null> {
    return this.prisma.room.findFirst({ where: { id, deletedAt: null } });
  }

  async update(id: number, updateRoomDto: UpdateRoomDto): Promise<Room> {
    return this.prisma.room.update({ where: { id }, data: updateRoomDto });
  }

  async softDelete(id: number) {
    await this.prisma.room.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
