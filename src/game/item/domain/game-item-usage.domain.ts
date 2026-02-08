import { ITEM_DOMAIN_ERRORS, ITEM_ERROR_CODES } from '../constant/game-item.constant';
import { GameItemSpec, UseItemResult } from '../interfaces/game-item.interface';
import { ConflictException, HttpException, HttpStatus } from '@nestjs/common';

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

    if (remaining <= 0) throw new ConflictException({ code: ITEM_ERROR_CODES.NOT_ENOUGH });
    if (cooldownEndsAt > now) {
      throw new HttpException(
        {
          code: ITEM_ERROR_CODES.COOLDOWN_REMAINING,
          errors: [ITEM_DOMAIN_ERRORS.COOLDOWN_REMAINING],
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (!spec) throw new ConflictException({ code: ITEM_ERROR_CODES.SPEC_NOT_FOUND });

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
