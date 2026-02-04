import { Injectable } from '@nestjs/common';
import { ItemInventoryService } from '../../item/services/item-inventory.service';
import { ItemSpecCacheService } from '../../item/services/item-spec-cache.service';
import { CooldownStore } from './stores/cooldown.store';
import { GameInventoryStore } from './stores/game-inventory.store';
import { SystemNotificationErrorPayload, UseItemResult } from './interfaces/game-item.interface';

@Injectable()
export class GameItemService {
  constructor(
    private readonly inventoryDb: ItemInventoryService,
    private readonly specCache: ItemSpecCacheService,
    private readonly cooldownStore: CooldownStore,
    private readonly invStore: GameInventoryStore,
  ) {}

  async initInventory(phaseKey: string, userId: number) {
    const rows = await this.inventoryDb.getUserInventoryRows(userId);
    this.invStore.initUser(phaseKey, userId, rows);
  }

  async useItem(params: {
    phaseKey: string;
    attackerUserId: number;
    attackerNickname: string;
    targetUserId: number;
    targetNickname: string;
    itemId: number;
    now?: number;
  }): Promise<UseItemResult> {
    const now = params.now ?? Date.now();

    const remaining = this.invStore.getRemaining(
      params.phaseKey,
      params.attackerUserId,
      params.itemId,
    );
    if (remaining <= 0) this.throwNotEnough();

    const endsAt = this.cooldownStore.getEndsAt(
      params.phaseKey,
      params.attackerUserId,
      params.itemId,
    );
    if (endsAt > now) this.throwCooldown();

    const spec = await this.specCache.get(params.itemId);
    if (!spec) this.throwNotEnough();

    // 소모
    const newRemaining = this.invStore.decrement(
      params.phaseKey,
      params.attackerUserId,
      params.itemId,
    );

    // 쿨타임 설정
    const newEndsAt = now + spec.cooldownMs;
    this.cooldownStore.setEndsAt(params.phaseKey, params.attackerUserId, params.itemId, newEndsAt);

    return {
      notification: {
        attackerNickname: params.attackerNickname,
        targetNickname: params.targetNickname,
        itemName: spec.name,
      },
      applyEffect: {
        itemId: params.itemId,
        duration: spec.durationMs,
      },
      inventoryUpdate: {
        itemId: params.itemId,
        count: newRemaining,
        cooldownEndsAt: newEndsAt,
      },
    };
  }

  /** drawing 종료 시: 사용량 DB 정산 반영 + 메모리 정리 */
  async commitInventory(phaseKey: string) {
    const usedList = this.invStore.extractUsed(phaseKey);
    if (usedList.length > 0) {
      await this.inventoryDb.applyUsedQuantities(usedList);
    }
    this.invStore.clear(phaseKey);
    this.cooldownStore.clear(phaseKey);
  }

  // -------- errors --------
  private throwNotEnough(): never {
    const err: SystemNotificationErrorPayload = {
      status: 409,
      code: 'ITEM_NOT_ENOUGH',
      errors: [{ field: 'itemId', reason: ['아이템이 부족합니다.'] }],
    };
    throw err;
  }

  private throwCooldown(): never {
    const err: SystemNotificationErrorPayload = {
      status: 429,
      code: 'ITEM_COOLDOWN_REMAINING',
      errors: [{ field: 'cooldown', reason: ['쿨타임이 남았습니다'] }],
    };
    throw err;
  }
}
