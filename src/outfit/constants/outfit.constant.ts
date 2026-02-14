import { OutfitIds, OutfitAssetPaths } from '../outfit.type';

export const OUTFIT_ERROR_CODES = {
  ITEM_NOT_OWNED: 'ITEM_NOT_OWNED',
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  INVALID_CATEGORY_MATCH: 'INVALID_CATEGORY_MATCH',
  MISSING_OUTFIT_FIELD: 'MISSING_OUTFIT_FIELD',
  MISSING_BIRD_FIELD: 'MISSING_BIRD_FIELD',
} as const;

export const OUTFIT_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  ITEM_NOT_OWNED: {
    field: 'outfit',
    reason: 'You do not own this item',
  },
  MISSING_OUTFIT_FIELD: {
    field: 'outfit',
    reason: 'Outfit data is required',
  },
  MISSING_BIRD_FIELD: {
    field: 'bird',
    reason: 'Bird is required',
  },
};

export const DEFAULT_BIRD_ID = 150;

export const DEFAULT_OUTFIT: OutfitIds = {
  bird: DEFAULT_BIRD_ID,
  hat: null,
  accessory: null,
  top: null,
  bottom: null,
  shoes: null,
  effect: null,
};

export const DEFAULT_BIRD_PATH = 'bird_01';

export const DEFAULT_OUTFIT_PATHS: OutfitAssetPaths = {
  bird: DEFAULT_BIRD_PATH,
  hat: null,
  accessory: null,
  top: null,
  bottom: null,
  shoes: null,
  effect: null,
};
