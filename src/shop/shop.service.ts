import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IShopRepository } from './interfaces/shop-repository.interface';
import { GameItemsResponseDto } from './dtos/responses/game-items.response.dto';
import { GameItemResponseDto } from './dtos/responses/game-item.response.dto';
import { InventoryIdsResponseDto } from './dtos/responses/inventory-ids.response.dto';
import { PurchaseResultResponseDto } from './dtos/responses/purchase-result.response.dto';
import { SHOP_DOMAIN_ERRORS, SHOP_ERROR_CODES } from './constants/shop.constant';
import { CosmeticItemsResponseDto } from './dtos/responses/cosmetic-items.response.dto';
import { CosmeticItemResponseDto } from './dtos/responses/cosmetic-item.response.dto';
import { PurchaseItemsRequestDto } from './dtos/requests/purchase-items.request.dto';

@Injectable()
export class ShopService {
  constructor(
    @Inject('IShopRepository')
    private readonly shopRepository: IShopRepository,
  ) {}

  async getCosmetics(userId: number): Promise<CosmeticItemsResponseDto> {
    const [items, ownedIds] = await Promise.all([
      this.shopRepository.findAllCosmeticItems(),
      this.shopRepository.findOwnedCosmeticIds(userId),
    ]);

    const ownedIdsSet = new Set(ownedIds);

    return new CosmeticItemsResponseDto(
      items.map((item) => new CosmeticItemResponseDto(item, ownedIdsSet.has(item.id))),
    );
  }

  async getConsumables(userId: number): Promise<GameItemsResponseDto> {
    const [items, ownedIds] = await Promise.all([
      this.shopRepository.findAllGameItems(),
      this.shopRepository.findOwnedGameItemIds(userId),
    ]);

    const ownedIdsSet = new Set(ownedIds);

    return new GameItemsResponseDto(
      items.map((item) => new GameItemResponseDto(item, ownedIdsSet.has(item.id))),
    );
  }

  async getMyCosmeticInventoryIds(userId: number): Promise<InventoryIdsResponseDto> {
    const ownedIds = await this.shopRepository.findOwnedCosmeticIds(userId);
    return new InventoryIdsResponseDto(ownedIds);
  }

  async purchaseItems(
    userId: number,
    request: PurchaseItemsRequestDto,
  ): Promise<PurchaseResultResponseDto> {
    const cosmeticItemIds = request.cosmeticItems?.map((i) => i.itemId) ?? [];
    const gameItemQuantityMap = new Map(
      request.gameItems?.map((i) => [i.itemId, i.quantity]) ?? [],
    );

    if (!cosmeticItemIds.length && gameItemQuantityMap.size === 0) {
      throw new BadRequestException({ code: SHOP_ERROR_CODES.EMPTY_PURCHASE_REQUEST });
    }

    const user = await this.shopRepository.findUserWithProfile(userId);
    if (!user) {
      throw new NotFoundException();
    }

    const [cosmeticItems, gameItems] = await Promise.all([
      this.shopRepository.findCosmeticItemsByIds(new Set(cosmeticItemIds)),
      this.shopRepository.findGameItemsByIds(new Set(gameItemQuantityMap.keys())),
    ]);

    if (
      cosmeticItems.length !== cosmeticItemIds.length ||
      gameItems.length !== gameItemQuantityMap.size
    ) {
      throw new NotFoundException({ code: SHOP_ERROR_CODES.ITEM_NOT_FOUND });
    }

    const ownedCosmeticIds = new Set(await this.shopRepository.findOwnedCosmeticIds(userId));
    if (cosmeticItems.some((item) => ownedCosmeticIds.has(item.id))) {
      throw new ConflictException({
        code: SHOP_ERROR_CODES.ALREADY_OWNED_ITEM,
        errors: [SHOP_DOMAIN_ERRORS.ALREADY_OWNED_ITEM],
      });
    }

    const allItems = [...cosmeticItems, ...gameItems];
    if (allItems.some((item) => user.level < item.level)) {
      throw new ForbiddenException({
        code: SHOP_ERROR_CODES.LEVEL_TOO_LOW,
        errors: [SHOP_DOMAIN_ERRORS.LEVEL_TOO_LOW],
      });
    }

    const totalPrice =
      cosmeticItems.reduce((sum, item) => sum + item.price, 0) +
      gameItems.reduce(
        (sum, item) => sum + item.price * (gameItemQuantityMap.get(item.id) ?? 0),
        0,
      );

    if (user.coins < totalPrice) {
      throw new ForbiddenException({
        code: SHOP_ERROR_CODES.INSUFFICIENT_BALANCE,
        errors: [SHOP_DOMAIN_ERRORS.INSUFFICIENT_BALANCE],
      });
    }

    await this.shopRepository.purchaseItems(
      userId,
      cosmeticItemIds,
      gameItemQuantityMap,
      totalPrice,
    );

    const updatedUser = await this.shopRepository.findUserWithProfile(userId);

    return new PurchaseResultResponseDto({
      purchasedCosmeticItemIds: cosmeticItemIds,
      purchasedGameItemIds: Array.from(gameItemQuantityMap.keys()),
      remainingCoin: updatedUser!.coins,
    });
  }
}
