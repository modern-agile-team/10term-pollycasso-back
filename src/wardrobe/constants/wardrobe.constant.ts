export const WARDROBE_ERROR_CODES = {
  MISSING_OUTFIT_FIELD: 'MISSING_OUTFIT_FIELD',
  MISSING_BIRD_FIELD: 'MISSING_BIRD_FIELD',
} as const;

export const WARDROBE_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  MISSING_OUTFIT_FIELD: {
    field: 'outfit',
    reason: 'Outfit data is required',
  },
  MISSING_BIRD_FIELD: {
    field: 'bird',
    reason: 'Bird is required',
  },
};
