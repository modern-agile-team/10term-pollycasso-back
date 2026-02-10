export class InventoryIdsResponseDto {
  inventoryIds: number[];

  constructor(ids: number[]) {
    this.inventoryIds = ids;
  }
}
