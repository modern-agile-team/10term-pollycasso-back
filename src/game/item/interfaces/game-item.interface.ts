export interface ItemNotificationPayload {
  attackerNickname: string;
  targetNickname: string;
  itemName: string;
}

export interface ApplyEffectPayload {
  itemId: number;
  duration: number; // ms
}

export interface InventoryUpdatePayload {
  itemId: number;
  count: number; // remaining
  cooldownEndsAt: number;
}

export type ItemErrorCode =
  | 'ITEM_NOT_ENOUGH'
  | 'ITEM_COOLDOWN_REMAINING'
  | 'ITEM_NOT_ALLOWED_PHASE';

export interface SystemNotificationErrorPayload {
  status: 403 | 409 | 429;
  code: ItemErrorCode;
  errors: Array<{ field: 'itemId' | 'cooldown' | 'phase'; reason: string[] }>;
}

export interface UseItemResult {
  notification: ItemNotificationPayload;
  applyEffect: ApplyEffectPayload;
  inventoryUpdate: InventoryUpdatePayload;
}
