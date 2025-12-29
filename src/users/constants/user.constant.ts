export const USER_ERROR_CODES = {
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  TAG_GENERATION_FAILED: 'TAG_GENERATION_FAILED',
} as const;

export const USER_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  TAG_GENERATION_FAILED: {
    field: 'tag',
    reason: 'Failed to generate a unique tag. Please try again.',
  },
};
