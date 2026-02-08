import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemSpecDto } from '../interfaces/item.interface';

const itemSpecSelect = {
  id: true,
  code: true,
  name: true,
  durationMs: true,
  cooldownMs: true,
} as const;

@Injectable()
export class GameItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  findSpecById(id: number): Promise<ItemSpecDto | null> {
    return this.prisma.gameItem.findUnique({
      where: { id },
      select: itemSpecSelect,
    });
  }

  findAllSpecs() {
    return this.prisma.gameItem.findMany({
      select: itemSpecSelect,
      orderBy: { id: 'asc' },
    });
  }
}
