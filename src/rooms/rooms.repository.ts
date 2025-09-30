import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Room as PrismaRoom } from '@prisma/client';
import { CreateRoomInput, FindRoomsQuery, UpdateRoomInput } from './rooms.interface';

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateRoomInput): Promise<PrismaRoom> {
    return this.prisma.room.create({ data: input });
  }

  async findAll(query: FindRoomsQuery): Promise<PrismaRoom[]> {
    const { name, mode, isPrivate, status } = query;
    const where: Prisma.RoomWhereInput = {};

    if (name) where.name = { contains: name };
    if (mode) where.mode = mode;
    if (isPrivate !== undefined) where.isPrivate = isPrivate;
    if (status) where.status = status;

    return this.prisma.room.findMany({
      where,
      orderBy: { id: 'desc' },
    });
  }

  findOne(id: number): Promise<PrismaRoom | null> {
    return this.prisma.room.findUnique({ where: { id } });
  }

  update(id: number, input: UpdateRoomInput): Promise<PrismaRoom> {
    return this.prisma.room.update({ where: { id }, data: input });
  }

  remove(id: number): Promise<PrismaRoom> {
    return this.prisma.room.delete({ where: { id } });
  }
}
