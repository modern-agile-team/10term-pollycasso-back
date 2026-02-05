export interface ItemSpecDto {
  id: number;
  code: string;
  name: string;
  durationMs: number;
  cooldownMs: number;
}

export interface UserInventoryRow {
  itemId: number;
  quantity: number;
}
