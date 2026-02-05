export interface ItemNotificationPayload {
  attackerUserId: number;
  attackerNickname: string;
  targetUserId: number;
  targetNickname: string;
  itemName: string;
}

export interface ApplyEffectPayload {
  itemId: number;
  duration: number;
}

export interface InventoryUpdatePayload {
  itemId: number;
  count: number;
  cooldownEndsAt: number;
}

export type ItemErrorCode =
  | 'ITEM_NOT_ENOUGH'
  | 'ITEM_COOLDOWN_REMAINING'
  | 'ITEM_NOT_ALLOWED_PHASE'
  | 'ITEM_TARGET_NOT_IN_ROOM';

export interface SystemNotificationErrorPayload {
  status: 403 | 409 | 429;
  code: ItemErrorCode;
  errors: Array<{ field: 'itemId' | 'cooldown' | 'phase' | 'targetUserId'; reason: string[] }>;
}

export interface UseItemResult {
  notification: ItemNotificationPayload;
  applyEffect: ApplyEffectPayload;
  inventoryUpdate: InventoryUpdatePayload;
}

export interface GameItemSpec {
  itemId: number;
  name: string;
  durationMs: number;
  cooldownMs: number;
}
