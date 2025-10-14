import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Room } from './entities/rooms.entity';
import { RoomMapper } from './entities/mappers/rooms.mapper';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(room: Room): Promise<Room> {
    const data = RoomMapper.toPersistence(room);
    const prismaRoom = await this.prisma.room.create({ data });
    return RoomMapper.toEntity(prismaRoom);
  }

  async findOne(id: number): Promise<Room | null> {
    const prismaRoom = await this.prisma.room.findUnique({ where: { id } });
    if (!prismaRoom) return null;
    return RoomMapper.toEntity(prismaRoom);
  }

  async findAll(query: QueryRoomDto, take: number): Promise<Room[]> {
    const where = this.createRoomFilter(query);

    const prismaRooms = await this.prisma.room.findMany({
      where,
      take: take + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      orderBy: { id: 'desc' },
      skip: query.cursor ? 1 : 0,
    });

    return prismaRooms.map((r) => RoomMapper.toEntity(r));
  }

  async update(id: number, room: Room): Promise<Room> {
    const data = RoomMapper.toPersistence(room);
    const prismaRoom = await this.prisma.room.update({ where: { id }, data });
    return RoomMapper.toEntity(prismaRoom);
  }

  async remove(id: number): Promise<void> {
    await this.prisma.room.delete({ where: { id } });
  }

  private createRoomFilter(query: QueryRoomDto): Prisma.RoomWhereInput {
    const where: Prisma.RoomWhereInput = {};
    if (query.name?.trim()) where.name = { contains: query.name.trim() };
    if (query.mode) where.mode = query.mode;
    if (query.isPrivate !== undefined) where.isPrivate = query.isPrivate;
    if (query.status) where.status = query.status;
    return where;
  }
}
