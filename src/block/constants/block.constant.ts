export const BLOCK_ERROR_CODES = {
  CANNOT_SELF_BLOCK: 'CANNOT_SELF_BLOCK',
  BLOCK_NOT_FOUND: 'BLOCK_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
} as const;

export const BLOCK_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  CANNOT_SELF_BLOCK: {
    field: 'targetUserId',
    reason: 'Cannot block yourself',
  },
};
