import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DrawingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertManyDrawings(
    rows: Array<{
      matchId: number;
      roomMemberId: number;
      round: number;
      data: Prisma.InputJsonValue;
    }>,
  ): Promise<void> {
    if (!rows.length) return;

    await this.prisma.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.drawing.upsert({
          where: {
            matchId_roomMemberId_round: {
              matchId: row.matchId,
              roomMemberId: row.roomMemberId,
              round: row.round,
            },
          },
          create: {
            matchId: row.matchId,
            roomMemberId: row.roomMemberId,
            round: row.round,
            data: row.data,
          },
          update: {
            data: row.data,
          },
        });
      }
    });
  }
}
