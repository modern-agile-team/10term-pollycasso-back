import { BadRequestException, Injectable } from '@nestjs/common';
import { ItemInventoryService } from '../../item/services/item-inventory.service';
import { ItemSpecCacheService } from '../../item/services/item-spec-cache.service';
import { CooldownStore } from './stores/cooldown.store';
import { GameInventoryStore } from './stores/game-inventory.store';
import { UseItemResult, GameItemSpec } from './interfaces/game-item.interface';
import { GameItemUsage } from './domain/game-item-usage.domain';
import { WaitingStore } from 'src/waiting/waiting.store';
import { ITEM_ERROR_CODES } from './constant/game-item.constant';

@Injectable()
export class GameItemService {
  constructor(
    private readonly inventoryDb: ItemInventoryService,
    private readonly specCache: ItemSpecCacheService,
    private readonly cooldownStore: CooldownStore,
    private readonly invStore: GameInventoryStore,
    private readonly waitingStore: WaitingStore,
  ) {}

  async initInventory(phaseKey: string, userId: number) {
    const rows = await this.inventoryDb.getUserInventoryRows(userId);
    this.invStore.initUser(phaseKey, userId, rows);
  }

  async useItemInRoom(params: {
    roomId: number;
    phaseKey: string;
    attackerUserId: number;
    attackerNickname: string;
    targetUserId: number;
    itemId: number;
    now?: number;
  }): Promise<UseItemResult> {
    const targetNickname = await this.waitingStore.getNickname(params.roomId, params.targetUserId);

    if (!targetNickname) {
      throw new BadRequestException({ code: ITEM_ERROR_CODES.TARGET_NOT_IN_ROOM });
    }

    return this.useItem({
      phaseKey: params.phaseKey,
      attackerUserId: params.attackerUserId,
      attackerNickname: params.attackerNickname,
      targetUserId: params.targetUserId,
      targetNickname,
      itemId: params.itemId,
      now: params.now,
    });
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

    const cooldownEndsAt = this.cooldownStore.getEndsAt(
      params.phaseKey,
      params.attackerUserId,
      params.itemId,
    );

    const spec = await this.specCache.get(params.itemId);

    const domainSpec: GameItemSpec | null = spec
      ? {
          itemId: params.itemId,
          name: spec.name,
          durationMs: spec.durationMs,
          cooldownMs: spec.cooldownMs,
        }
      : null;

    const { newCooldownEndsAt, result } = GameItemUsage.decide({
      now,
      attackerUserId: params.attackerUserId,
      attackerNickname: params.attackerNickname,
      targetUserId: params.targetUserId,
      targetNickname: params.targetNickname,
      itemId: params.itemId,
      remaining,
      cooldownEndsAt,
      spec: domainSpec,
    });

    this.invStore.decrement(params.phaseKey, params.attackerUserId, params.itemId);
    this.cooldownStore.setEndsAt(
      params.phaseKey,
      params.attackerUserId,
      params.itemId,
      newCooldownEndsAt,
    );

    return result;
  }

  async commitInventory(phaseKey: string) {
    const usedList = this.invStore.extractUsed(phaseKey);
    if (usedList.length > 0) {
      await this.inventoryDb.applyUsedQuantities(usedList);
    }
    this.invStore.clear(phaseKey);
    this.cooldownStore.clear(phaseKey);
  }
}
