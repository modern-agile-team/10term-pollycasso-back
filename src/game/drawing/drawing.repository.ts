import { Injectable } from '@nestjs/common';
import { type Drawing, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  DrawData,
  IDrawingRepo,
  isValidDrawData,
  MatchRoundCriteria,
} from './interface/drawing.interface';
import { DRAWING_ERRORS } from './constants/drawing.constant';
import { wsError } from 'src/common/utils/ws-error.util';

@Injectable()
export class DrawingRepository implements IDrawingRepo {
  constructor(private readonly prisma: PrismaService) {}

  private makeDrawingId(matchId: number, roomMemberId: number, round: number) {
    return `${matchId}:${roomMemberId}:${round}`;
  }

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

  async findManyByMatchIdAndRound(
    params: MatchRoundCriteria,
  ): Promise<Array<Pick<Drawing, 'matchId' | 'roomMemberId' | 'round' | 'data'>>> {
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

  async getDrawingsByMatchAndRound(params: MatchRoundCriteria): Promise<Record<string, DrawData>> {
    const rows = await this.findManyByMatchIdAndRound(params);

    const drawingsById: Record<string, DrawData> = {};
    for (const r of rows) {
      if (!isValidDrawData(r.data)) {
        throw wsError(500, DRAWING_ERRORS.DRAW_DATA_INVALID);
      }

      const drawingId = this.makeDrawingId(r.matchId, r.roomMemberId, r.round);
      drawingsById[drawingId] = r.data;
    }

    return drawingsById;
  }
}
