import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IShopRepository } from './interfaces/shop-repository.interface';
import { ShopItemsResponseDto } from './dtos/responses/shop-items.response.dto';
import { ShopItemResponseDto } from './dtos/responses/shop-item.response.dto';
import { InventoryIdsResponseDto } from './dtos/responses/inventory-ids.response.dto';
import { PurchaseResultResponseDto } from './dtos/responses/purchase-result.response.dto';
import { SHOP_DOMAIN_ERRORS, SHOP_ERROR_CODES } from './constants/shop.constant';

@Injectable()
export class ShopService {
  constructor(
    @Inject('IShopRepository')
    private readonly shopRepository: IShopRepository,
  ) {}

  async getShopItems(userId: number): Promise<ShopItemsResponseDto> {
    const [items, ownedIds] = await Promise.all([
      this.shopRepository.findAllItems(),
      this.shopRepository.findOwnedItemIds(userId),
    ]);

    const ownedIdsSet = new Set(ownedIds);

    return new ShopItemsResponseDto(
      items.map((item) => new ShopItemResponseDto(item, ownedIdsSet.has(item.id))),
    );
  }

  async getMyInventoryIds(userId: number): Promise<InventoryIdsResponseDto> {
    const ownedIds = await this.shopRepository.findOwnedItemIds(userId);
    return new InventoryIdsResponseDto(ownedIds);
  }

  async purchaseItems(userId: number, itemIds: number[]): Promise<PurchaseResultResponseDto> {
    const requestedItemIdSet = new Set(itemIds);

    const user = await this.shopRepository.findUserWithProfile(userId);
    if (!user) {
      throw new NotFoundException();
    }

    const items = await this.shopRepository.findItemsByIds(requestedItemIdSet);

    if (items.length !== requestedItemIdSet.size) {
      throw new NotFoundException({
        code: SHOP_ERROR_CODES.ITEM_NOT_FOUND,
      });
    }

    const ownedIds = await this.shopRepository.findOwnedItemIds(userId);
    const ownedItemIdSet = new Set(ownedIds);

    if ([...requestedItemIdSet].some((id) => ownedItemIdSet.has(id))) {
      throw new ConflictException({
        code: SHOP_ERROR_CODES.ALREADY_OWNED_ITEM,
        errors: [SHOP_DOMAIN_ERRORS.ALREADY_OWNED_ITEM],
      });
    }

    const levelBlocked = items.find((item) => user.level < item.level);
    if (levelBlocked) {
      throw new ForbiddenException({
        code: SHOP_ERROR_CODES.LEVEL_TOO_LOW,
        errors: [SHOP_DOMAIN_ERRORS.LEVEL_TOO_LOW],
      });
    }

    const totalPrice = items.reduce((sum, item) => sum + item.price, 0);

    if (user.coins < totalPrice) {
      throw new ForbiddenException({
        code: SHOP_ERROR_CODES.INSUFFICIENT_BALANCE,
        errors: [SHOP_DOMAIN_ERRORS.INSUFFICIENT_BALANCE],
      });
    }

    await this.shopRepository.purchaseItems(userId, items);

    return new PurchaseResultResponseDto({
      purchasedItemIds: [...requestedItemIdSet],
      remainingCoin: user.coins - totalPrice,
    });
  }
}
