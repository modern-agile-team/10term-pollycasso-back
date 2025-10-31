import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Room } from './entities/rooms.entity';
import { RoomMapper } from './entities/mappers/rooms.mapper';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { Prisma } from '@prisma/client';
import { IRoomsRepository } from './interfaces/rooms.repository.interface';
import { paginate } from 'src/common/pagination/paginate.util';

@Injectable()
export class RoomsRepository implements IRoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(room: Room): Promise<Room> {
    const data = RoomMapper.toPersistence(room);
    const prismaRoom = await this.prisma.room.create({ data });
    return RoomMapper.toEntity(prismaRoom);
  }

  async findOneRoom(id: number): Promise<Room | null> {
    const prismaRoom = await this.prisma.room.findUnique({ where: { id } });
    if (!prismaRoom) return null;
    return RoomMapper.toEntity(prismaRoom);
  }

  async findAllRooms(
    query: QueryRoomDto,
    limit: number,
  ): Promise<{ data: Room[]; hasNextPage: boolean; nextCursor: number | null }> {
    const where = this.createRoomFilter(query);

    const prismaRooms = await this.prisma.room.findMany({
      where,
      take: limit + 1,
      cursor: query.cursor ? { id: query.cursor } : undefined,
      skip: query.cursor ? 1 : 0,
      orderBy: { id: 'desc' },
    });

    const paginatedPrismaRooms = paginate(prismaRooms, limit);

    return {
      data: paginatedPrismaRooms.data.map((room) => RoomMapper.toEntity(room)),
      hasNextPage: paginatedPrismaRooms.hasNextPage,
      nextCursor: paginatedPrismaRooms.nextCursor,
    };
  }

  async updateRoom(id: number, room: Room): Promise<Room> {
    const data = RoomMapper.toPersistence(room);
    const prismaRoom = await this.prisma.room.update({ where: { id }, data });
    return RoomMapper.toEntity(prismaRoom);
  }

  async deleteRoom(id: number): Promise<void> {
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
