import { ITEM_ERRORS } from '../constant/game-item.constant';
import { GameItemSpec, UseItemResult } from '../interfaces/game-item.interface';

export class GameItemUsage {
  static decide(params: {
    now: number;

    attackerUserId: number;
    attackerNickname: string;

    targetUserId: number;
    targetNickname: string;

    itemId: number;
    remaining: number;
    cooldownEndsAt: number;
    spec?: GameItemSpec | null;
  }): { newRemaining: number; newCooldownEndsAt: number; result: UseItemResult } {
    const {
      now,
      attackerUserId,
      attackerNickname,
      targetUserId,
      targetNickname,
      itemId,
      remaining,
      cooldownEndsAt,
      spec,
    } = params;

    if (remaining <= 0) throw { ...ITEM_ERRORS.NOT_ENOUGH };
    if (cooldownEndsAt > now) throw { ...ITEM_ERRORS.COOLDOWN_REMAINING };
    if (!spec) throw { ...ITEM_ERRORS.NOT_ENOUGH };

    const newRemaining = remaining - 1;
    const newCooldownEndsAt = now + spec.cooldownMs;

    const result: UseItemResult = {
      notification: {
        attackerUserId,
        attackerNickname,
        targetUserId,
        targetNickname,
        itemName: spec.name,
      },
      applyEffect: {
        itemId,
        duration: spec.durationMs,
      },
      inventoryUpdate: {
        itemId,
        count: newRemaining,
        cooldownEndsAt: newCooldownEndsAt,
      },
    };

    return { newRemaining, newCooldownEndsAt, result };
  }
}
