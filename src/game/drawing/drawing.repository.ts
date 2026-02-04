import { Injectable } from '@nestjs/common';
import { type Drawing, Prisma } from '@prisma/client';
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
      await Promise.all(
        rows.map((row) =>
          tx.drawing.upsert({
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
          }),
        ),
      );
    });
  }

  async findManyByMatchIdAndRound(params: {
    matchId: number;
    round: number;
  }): Promise<Array<Pick<Drawing, 'matchId' | 'roomMemberId' | 'round' | 'data'>>> {
    const { matchId, round } = params;

    return this.prisma.drawing.findMany({
      where: { matchId, round },
      select: {
        matchId: true,
        roomMemberId: true,
        round: true,
        data: true,
      },
    });
  }
}
