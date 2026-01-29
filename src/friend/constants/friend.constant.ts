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
  BLOCKED_BY_TARGET: {
    field: 'targetUserId',
    reason: 'You cannot send a friend request because the user has blocked you',
  },
  BLOCKING_TARGET: {
    field: 'targetUserId',
    reason: 'You cannot send a friend request to a user you have blocked',
  },
  CANNOT_CANCEL_RECEIVED_REQUEST: {
    field: 'requestId',
    reason:
      'You cannot cancel a friend request that you received. Please reject or accept it instead',
  },
  CANNOT_RESPOND_OWN_REQUEST: {
    field: 'requestId',
    reason: 'You cannot respond to a friend request that you sent',
  },
};
