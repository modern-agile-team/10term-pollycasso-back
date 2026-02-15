import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IWardrobeRepository } from './interfaces/wardrobe-repository.interface';
import { UpdateOutfitRequestDto } from './dtos/requests/update-outfit.request.dto';
import { WardrobeCosmeticInventoryResponseDto } from './dtos/responses/wardrobe-cosmetic-inventory.response.dto';
import { WardrobeConsumableInventoryResponseDto } from './dtos/responses/wardrobe-consumable-inventory.response.dto';
import { Outfit } from 'src/outfit/entities/outfit.entity';
import { OutfitIds } from 'src/outfit/outfit.type';
import { OutfitIdsResponseDto } from 'src/outfit/dtos/responses/outfit-ids-response.dto';
import { WARDROBE_ERROR_CODES } from './constants/wardrobe.constant';

@Injectable()
export class WardrobeService {
  constructor(
    @Inject('IWardrobeRepository')
    private readonly wardrobeRepository: IWardrobeRepository,
  ) {}

  async getCosmeticInventory(userId: number): Promise<WardrobeCosmeticInventoryResponseDto> {
    const [inventory, outfit] = await Promise.all([
      this.wardrobeRepository.findUserCosmeticInventory(userId),
      this.wardrobeRepository.findUserProfileOutfit(userId),
    ]);

    const outfitEntity = outfit ? Outfit.load(outfit) : null;
    const equippedIds = outfitEntity?.getEquippedIds() ?? new Set<number>();
    const cosmeticItems = inventory.map((item) => item.cosmeticItem);

    return new WardrobeCosmeticInventoryResponseDto(cosmeticItems, equippedIds);
  }

  async getConsumableInventory(userId: number): Promise<WardrobeConsumableInventoryResponseDto> {
    const inventory = await this.wardrobeRepository.findUserConsumableInventory(userId);
    return new WardrobeConsumableInventoryResponseDto(inventory);
  }

  async updateOutfit(
    userId: number,
    request: UpdateOutfitRequestDto,
  ): Promise<OutfitIdsResponseDto> {
    const outfitIds: OutfitIds = request.outfitIds;
    const outfit = Outfit.create(outfitIds);

    await this.validateOwnership(outfit, userId);
    await this.validateCategories(outfit);
    await this.wardrobeRepository.updateUserOutfit(userId, outfit.getAll());

    return new OutfitIdsResponseDto(outfit.getAll());
  }

  private async validateOwnership(outfit: Outfit, userId: number): Promise<void> {
    const ownedCosmeticIds = await this.wardrobeRepository.findOwnedCosmeticIds(userId);
    const ownedCosmeticIdsSet = new Set(ownedCosmeticIds);
    outfit.validateOwnership(ownedCosmeticIdsSet);
  }

  private async validateCategories(outfit: Outfit): Promise<void> {
    const equippedItemIds = outfit.getEquippedIds();

    if (equippedItemIds.size === 0) {
      return;
    }

    const cosmeticItems = await this.wardrobeRepository.findCosmeticItemsByIds(equippedItemIds);

    if (cosmeticItems.length !== equippedItemIds.size) {
      throw new NotFoundException({ code: WARDROBE_ERROR_CODES.ITEM_NOT_FOUND });
    }

    const cosmeticItemMap = new Map(
      cosmeticItems.map((item) => [item.id, { subCategory: item.subCategory }]),
    );

    outfit.validateCategories(cosmeticItemMap);
  }
}
