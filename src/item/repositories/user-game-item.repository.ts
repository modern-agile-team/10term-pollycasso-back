import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserGameItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserInventory(userId: number) {
    return this.prisma.userGameItem.findMany({
      where: { userId },
      select: { gameItemId: true, quantity: true },
    });
  }

  async decrementQuantityTx(
    tx: Prisma.TransactionClient,
    userId: number,
    gameItemId: number,
    used: number,
  ) {
    const current = await tx.userGameItem.findUnique({
      where: { userId_gameItemId: { userId, gameItemId } },
      select: { quantity: true },
    });

    const curQty = current?.quantity ?? 0;
    if (curQty < used) {
      throw new Error(
        `INVENTORY_NEGATIVE userId=${userId} itemId=${gameItemId} cur=${curQty} used=${used}`,
      );
    }

    await tx.userGameItem.update({
      where: { userId_gameItemId: { userId, gameItemId } },
      data: { quantity: { decrement: used } },
    });
  }
}
