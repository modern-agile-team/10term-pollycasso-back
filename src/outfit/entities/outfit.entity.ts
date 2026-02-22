import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CosmeticSubCategory } from '@prisma/client';
import { OutfitIds } from '../outfit.type';
import { ErrorDetail } from 'src/common/utils/error-response.util';
import {
  DEFAULT_OUTFIT,
  OUTFIT_DOMAIN_ERRORS,
  OUTFIT_ERROR_CODES,
} from '../constants/outfit.constant';

type UpdateOutfitProps = Partial<OutfitIds>;

export class Outfit {
  private constructor(private props: OutfitIds) {}

  static create(props: OutfitIds | undefined | null): Outfit {
    if (!props) {
      throw new BadRequestException({
        code: OUTFIT_ERROR_CODES.MISSING_OUTFIT_FIELD,
        errors: [OUTFIT_DOMAIN_ERRORS[OUTFIT_ERROR_CODES.MISSING_OUTFIT_FIELD]],
      });
    }

    return new Outfit(props);
  }

  static load(props: OutfitIds): Outfit {
    return new Outfit(props);
  }

  static fromJSON(raw: unknown): Outfit {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return new Outfit(DEFAULT_OUTFIT);
    }

    const obj = raw as Partial<OutfitIds>;

    return new Outfit({
      bird: typeof obj.bird === 'number' ? obj.bird : DEFAULT_OUTFIT.bird,
      hat: typeof obj.hat === 'number' ? obj.hat : null,
      accessory: typeof obj.accessory === 'number' ? obj.accessory : null,
      top: typeof obj.top === 'number' ? obj.top : null,
      bottom: typeof obj.bottom === 'number' ? obj.bottom : null,
      shoes: typeof obj.shoes === 'number' ? obj.shoes : null,
      effect: typeof obj.effect === 'number' ? obj.effect : null,
    });
  }

  toJSON(): string {
    return JSON.stringify(this.props);
  }

  getAll(): OutfitIds {
    return { ...this.props };
  }

  getEquippedIds(): Set<number> {
    return new Set(
      Object.values(this.props).filter((value): value is number => typeof value === 'number'),
    );
  }

  update(props: UpdateOutfitProps): void {
    const updates = Object.fromEntries(
      Object.entries(props).filter(([, value]) => value !== undefined),
    );

    Object.assign(this.props, updates);
  }

  validateOwnership(ownedIds: Set<number>): void {
    const notOwnedItems: ErrorDetail[] = Object.entries(this.props)
      .filter(([, itemId]) => itemId != null && !ownedIds.has(itemId))
      .map(([key]) => ({
        field: key,
        reason: ['You do not own this item'],
      }));

    if (notOwnedItems.length > 0) {
      throw new ForbiddenException({
        code: OUTFIT_ERROR_CODES.ITEM_NOT_OWNED,
        errors: notOwnedItems,
      });
    }
  }

  validateCategories(cosmeticItemMap: Map<number, { subCategory: CosmeticSubCategory }>): void {
    const categoryMap: Record<keyof OutfitIds, CosmeticSubCategory> = {
      bird: CosmeticSubCategory.BIRD,
      hat: CosmeticSubCategory.HAT,
      accessory: CosmeticSubCategory.ACC,
      top: CosmeticSubCategory.TOP,
      bottom: CosmeticSubCategory.BOTTOM,
      shoes: CosmeticSubCategory.SHOES,
      effect: CosmeticSubCategory.EFFECT,
    };

    const validationErrors: ErrorDetail[] = Object.entries(this.props)
      .filter(([key, itemId]) => {
        if (itemId == null) return false;

        const cosmeticItem = cosmeticItemMap.get(itemId);
        return cosmeticItem != null && categoryMap[key] !== cosmeticItem.subCategory;
      })
      .map(([key]) => ({
        field: key,
        reason: [`This item is not in the ${key} category`],
      }));

    if (validationErrors.length > 0) {
      throw new BadRequestException({
        code: OUTFIT_ERROR_CODES.INVALID_CATEGORY_MATCH,
        errors: validationErrors,
      });
    }
  }
}
