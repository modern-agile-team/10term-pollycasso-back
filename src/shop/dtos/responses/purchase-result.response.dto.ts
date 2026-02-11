export class PurchaseResultResponseDto {
  purchasedCosmeticItemIds: number[];
  purchasedGameItemIds: number[];
  remainingCoin: number;

  constructor(params: {
    purchasedCosmeticItemIds: number[];
    purchasedGameItemIds: number[];
    remainingCoin: number;
  }) {
    this.purchasedCosmeticItemIds = params.purchasedCosmeticItemIds;
    this.purchasedGameItemIds = params.purchasedGameItemIds;
    this.remainingCoin = params.remainingCoin;
  }
}
