export const SHOP_ERROR_CODES = {
  ITEM_NOT_FOUND: 'ITEM_NOT_FOUND',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  LEVEL_TOO_LOW: 'LEVEL_TOO_LOW',
  ALREADY_OWNED_ITEM: 'ALREADY_OWNED_ITEM',
} as const;

export const SHOP_DOMAIN_ERRORS = {
  INSUFFICIENT_BALANCE: {
    field: 'coins',
    reason: 'You do not have enough coins to purchase this item',
  },
  LEVEL_TOO_LOW: {
    field: 'level',
    reason: 'Your level is too low to purchase this item',
  },
  ALREADY_OWNED_ITEM: {
    field: 'itemId',
    reason: 'You already own this item',
  },
};
