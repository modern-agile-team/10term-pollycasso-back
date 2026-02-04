import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserGameItemRepository } from '../repositories/user-game-item.repository';
import { UserInventoryRow } from '../interfaces/item.interface';

@Injectable()
export class ItemInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepo: UserGameItemRepository,
  ) {}

  /** drawing 시작 시 스냅샷용: itemId, quantity만 */
  async getUserInventoryRows(userId: number): Promise<UserInventoryRow[]> {
    const rows = await this.userRepo.findUserInventory(userId);
    return rows.map((r) => ({ itemId: r.gameItemId, quantity: r.quantity }));
  }

  /** drawing 종료 정산: used 만큼 차감 */
  async applyUsedQuantities(usedList: Array<{ userId: number; itemId: number; used: number }>) {
    if (usedList.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      for (const row of usedList) {
        if (row.used <= 0) continue;
        await this.userRepo.decrementQuantityTx(tx, row.userId, row.itemId, row.used);
      }
    });
  }
}
