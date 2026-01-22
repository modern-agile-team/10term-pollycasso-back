export const FRIEND_ERROR_CODES = {
  CANNOT_ADD_SELF: 'CANNOT_ADD_SELF',
  REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
  INVALID_REQUEST_STATUS: 'INVALID_REQUEST_STATUS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NOT_FRIENDS: 'NOT_FRIENDS',
} as const;

export const FRIEND_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  CANNOT_ADD_SELF: {
    field: 'targetTag',
    reason: 'Cannot send friend request to yourself',
  },
  INVALID_REQUEST_STATUS: {
    field: 'status',
    reason: 'Friend request must be in PENDING status',
  },
  NOT_FRIENDS: {
    field: 'friendTag',
    reason: 'You are not friends with this user',
  },
};
