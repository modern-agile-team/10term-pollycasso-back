export const ITEM_ERROR_CODES = {
  NOT_ENOUGH: 'ITEM_NOT_ENOUGH',
  COOLDOWN_REMAINING: 'ITEM_COOLDOWN_REMAINING',
  NOT_ALLOWED_PHASE: 'ITEM_NOT_ALLOWED_PHASE',
  SPEC_NOT_FOUND: 'ITEM_SPEC_NOT_FOUND',
  TARGET_NOT_IN_ROOM: 'ITEM_TARGET_NOT_IN_ROOM',
} as const;

export const ITEM_DOMAIN_ERRORS = {
  COOLDOWN_REMAINING: {
    field: 'cooldown',
    reason: 'Cooldown time is still remaining.',
  },
  NOT_ALLOWED_PHASE: {
    field: 'phase',
    reason: 'You cannot use an item in the current phase.',
  },
} as const;
