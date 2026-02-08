export class PurchaseResultResponseDto {
  isSuccess: boolean;
  purchasedItemIds: number[];
  remainingCoin: number;

  constructor(payload: { purchasedItemIds: number[]; remainingCoin: number }) {
    this.isSuccess = true;
    this.purchasedItemIds = payload.purchasedItemIds;
    this.remainingCoin = payload.remainingCoin;
  }
}
