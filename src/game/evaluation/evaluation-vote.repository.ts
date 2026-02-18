import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { wsError } from 'src/common/utils/ws-error.util';
import { EVALUATION_ERRORS } from './constants/evaluation.constant';
import type { IEvaluationVote } from './interfaces/evaluation-vote.interface';

@Injectable()
export class EvaluationVoteRepository implements IEvaluationVote {
  constructor(private readonly prisma: PrismaService) {}

  async upsertVoteByDrawingKey(params: {
    matchId: number;
    round: number;
    roomMemberId: number;
    voterId: number;
    rating: number;
  }): Promise<void> {
    const drawing = await this.prisma.drawing.findUnique({
      where: {
        matchId_roomMemberId_round: {
          matchId: params.matchId,
          roomMemberId: params.roomMemberId,
          round: params.round,
        },
      },
      select: { id: true },
    });

    if (!drawing) {
      throw wsError(400, EVALUATION_ERRORS.DRAWING_ID_INVALID);
    }

    await this.prisma.vote.upsert({
      where: {
        drawingId_voterId: { drawingId: drawing.id, voterId: params.voterId },
      },
      create: {
        drawingId: drawing.id,
        voterId: params.voterId,
        rating: params.rating,
        deletedAt: null,
      },
      update: {
        rating: params.rating,
        deletedAt: null,
      },
    });
  }

  async countVotesByVoter(params: {
    matchId: number;
    round: number;
    voterId: number;
  }): Promise<number> {
    return this.prisma.vote.count({
      where: {
        voterId: params.voterId,
        deletedAt: null,
        drawing: { matchId: params.matchId, round: params.round },
      },
    });
  }

  async sumRatingsByDrawingKey(params: {
    matchId: number;
    round: number;
  }): Promise<Record<string, number>> {
    const drawings = await this.prisma.drawing.findMany({
      where: { matchId: params.matchId, round: params.round },
      select: { id: true, roomMemberId: true },
    });

    if (drawings.length === 0) return {};

    const ids = drawings.map((d) => d.id);

    const grouped = await this.prisma.vote.groupBy({
      by: ['drawingId'],
      where: {
        deletedAt: null,
        drawingId: { in: ids },
      },
      _sum: { rating: true },
    });

    const sumByDrawingDbId = new Map<number, number>();
    for (const row of grouped) {
      sumByDrawingDbId.set(row.drawingId, row._sum.rating ?? 0);
    }

    const out: Record<string, number> = {};
    for (const d of drawings) {
      const key = `${params.matchId}:${d.roomMemberId}:${params.round}`;
      out[key] = sumByDrawingDbId.get(d.id) ?? 0;
    }
    return out;
  }

  async countDistinctTargetsByVoter(params: {
    matchId: number;
    round: number;
    voterId: number;
  }): Promise<number> {
    const rows = await this.prisma.vote.findMany({
      where: {
        voterId: params.voterId,
        deletedAt: null,
        drawing: { matchId: params.matchId, round: params.round },
      },
      select: {
        drawing: { select: { roomMemberId: true } },
      },
    });

    const distinct = new Set<number>();
    for (const r of rows) {
      distinct.add(r.drawing.roomMemberId);
    }
    return distinct.size;
  }
}
