export const USER_ERROR_CODES = {
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  TAG_GENERATION_FAILED: 'TAG_GENERATION_FAILED',
  WRONG_PASSWORD: 'WRONG_PASSWORD',
  DUPLICATE_IDENTITY: 'DUPLICATE_IDENTITY',
  SOCIAL_USER_NO_PASSWORD: 'SOCIAL_USER_NO_PASSWORD',
} as const;

export const USER_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  TAG_GENERATION_FAILED: {
    field: 'tag',
    reason: 'Failed to generate a unique tag. Please try again.',
  },
  WRONG_PASSWORD: {
    field: 'currentPassword',
    reason: 'Current password does not match.',
  },
  DUPLICATE_IDENTITY: {
    field: 'nickname',
    reason: 'This nickname and tag combination is already in use.',
  },
  SOCIAL_USER_NO_PASSWORD: {
    field: 'currentPassword',
    reason: 'Social login accounts cannot change password.',
  },
} as const;
