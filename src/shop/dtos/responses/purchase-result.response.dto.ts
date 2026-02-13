export class PurchaseResultResponseDto {
  purchasedCosmeticItemIds: number[];
  purchasedGameItemIds: number[];
  remainingCoins: number;

  constructor(params: {
    purchasedCosmeticItemIds: number[];
    purchasedGameItemIds: number[];
    remainingCoins: number;
  }) {
    this.purchasedCosmeticItemIds = params.purchasedCosmeticItemIds;
    this.purchasedGameItemIds = params.purchasedGameItemIds;
    this.remainingCoins = params.remainingCoins;
  }
}
