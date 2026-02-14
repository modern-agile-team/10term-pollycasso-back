import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { IWardrobeRepository } from './interfaces/wardrobe-repository.interface';
import { UpdateOutfitRequestDto } from './dtos/requests/update-outfit.request.dto';
import { WardrobeCosmeticInventoryResponseDto } from './dtos/responses/wardrobe-cosmetic-inventory.response.dto';
import { WardrobeConsumableInventoryResponseDto } from './dtos/responses/wardrobe-consumable-inventory.response.dto';
import { WARDROBE_ERROR_CODES } from './constants/wardrobe.constant';
import { Outfit } from 'src/outfit/entities/outfit.entity';
import { OutfitIds } from 'src/outfit/outfit.type';
import { OutfitIdsResponseDto } from 'src/outfit/dtos/responses/outfit-ids-response.dto';

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
    if (!request.outfitIds) {
      throw new BadRequestException({
        code: WARDROBE_ERROR_CODES.MISSING_OUTFIT_FIELD,
      });
    }
    const bird = request.outfitIds.bird;
    if (bird === null || bird === undefined) {
      throw new BadRequestException({
        code: WARDROBE_ERROR_CODES.MISSING_BIRD_FIELD,
      });
    }

    const outfitIds: OutfitIds = {
      bird,
      hat: request.outfitIds.hat ?? null,
      accessory: request.outfitIds.accessory ?? null,
      top: request.outfitIds.top ?? null,
      bottom: request.outfitIds.bottom ?? null,
      shoes: request.outfitIds.shoes ?? null,
      effect: request.outfitIds.effect ?? null,
    };

    const outfit = Outfit.create(outfitIds);

    const ownedCosmeticIds = await this.wardrobeRepository.findOwnedCosmeticIds(userId);
    const ownedCosmeticIdsSet = new Set(ownedCosmeticIds);
    outfit.validateOwnership(ownedCosmeticIdsSet);

    const itemIds = Object.values(outfitIds).filter(
      (id): id is number => id !== null && id !== undefined,
    );

    const cosmeticItems = await this.wardrobeRepository.findCosmeticItemsByIds(new Set(itemIds));
    const cosmeticItemMap = new Map(
      cosmeticItems.map((item) => [item.id, { id: item.id, subCategory: item.subCategory }]),
    );

    outfit.validateCategories(cosmeticItemMap);

    await this.wardrobeRepository.updateUserOutfit(userId, outfit.getAll());

    return new OutfitIdsResponseDto(outfit.getAll());
  }
}
