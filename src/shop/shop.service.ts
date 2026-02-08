import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SHOP_DOMAIN_ERRORS, SHOP_ERROR_CODES } from './constants/shop.constant';
import type { IShopRepository } from './interfaces/shop-repository.interface';
import { ShopItemsResponseDto } from './dtos/responses/shop-items.response.dto';
import { ShopItemResponseDto } from './dtos/responses/shop-item.response.dto';
import { InventoryIdsResponseDto } from './dtos/responses/inventory-ids.response.dto';
import { PurchaseResultResponseDto } from './dtos/responses/purchase-result.response.dto';

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

    return new ShopItemsResponseDto(
      items.map((item) => new ShopItemResponseDto(item, ownedIds.includes(item.id))),
    );
  }

  async getMyInventoryIds(userId: number): Promise<InventoryIdsResponseDto> {
    const ownedIds = await this.shopRepository.findOwnedItemIds(userId);
    return new InventoryIdsResponseDto(ownedIds);
  }

  async purchaseItems(userId: number, itemIds: number[]): Promise<PurchaseResultResponseDto> {
    if (!itemIds.length) {
      throw new BadRequestException();
    }

    const user = await this.shopRepository.findUserWithProfile(userId);
    if (!user) {
      throw new NotFoundException();
    }

    const items = await this.shopRepository.findItemsByIds(itemIds);
    if (items.length !== itemIds.length) {
      throw new NotFoundException({ code: SHOP_ERROR_CODES.ITEM_NOT_FOUND });
    }

    const ownedIds = await this.shopRepository.findOwnedItemIds(userId);
    const alreadyOwned = itemIds.find((id) => ownedIds.includes(id));
    if (alreadyOwned) {
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

    await this.shopRepository.purchaseItems(userId, items, totalPrice);

    const updatedUser = await this.shopRepository.findUserWithProfile(userId);

    return new PurchaseResultResponseDto({
      purchasedItemIds: itemIds,
      remainingCoin: updatedUser!.coins,
    });
  }
}
