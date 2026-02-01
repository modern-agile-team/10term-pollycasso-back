export const FRIEND_ERROR_CODES = {
  CANNOT_ADD_SELF: 'CANNOT_ADD_SELF',
  REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',
  INVALID_REQUEST_STATUS: 'INVALID_REQUEST_STATUS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  NOT_FRIENDS: 'NOT_FRIENDS',
  BLOCKED_BY_TARGET: 'BLOCKED_BY_TARGET',
  BLOCKING_TARGET: 'BLOCKING_TARGET',
  CANNOT_CANCEL_RECEIVED_REQUEST: 'CANNOT_CANCEL_RECEIVED_REQUEST',
  CANNOT_RESPOND_OWN_REQUEST: 'CANNOT_RESPOND_OWN_REQUEST',
  INVALID_KEYWORD: 'INVALID_KEYWORD',
  ALREADY_FRIENDS: 'ALREADY_FRIENDS',
} as const;

export const FRIEND_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  CANNOT_ADD_SELF: {
    field: 'targetUserId',
    reason: 'Cannot send friend request to yourself',
  },

  CANNOT_CANCEL_RECEIVED_REQUEST: {
    field: 'targetUserId',
    reason:
      'You cannot cancel a friend request that you received. Please reject or accept it instead',
  },

  CANNOT_RESPOND_OWN_REQUEST: {
    field: 'requesterId',
    reason: 'You cannot respond to a friend request that you sent',
  },

  INVALID_KEYWORD: {
    field: 'keyword',
    reason: 'Search keyword must be between 1 and 20 characters',
  },
};

export const FRIEND_SEARCH_RULES = {
  SEARCH_RESULT_LIMIT: 20,
  RECOMMENDED_FRIENDS_LIMIT: 5,
} as const;
