export const ITEM_ERRORS = {
  NOT_ENOUGH: {
    status: 409,
    code: 'ITEM_NOT_ENOUGH',
    errors: [{ field: 'itemId', reason: ['아이템이 부족합니다.'] }],
  },
  COOLDOWN_REMAINING: {
    status: 429,
    code: 'ITEM_COOLDOWN_REMAINING',
    errors: [{ field: 'cooldown', reason: ['쿨타임이 남았습니다'] }],
  },
  NOT_ALLOWED_PHASE: {
    status: 403,
    code: 'ITEM_NOT_ALLOWED_PHASE',
    errors: [{ field: 'phase', reason: ['현재 단계에서는 아이템을 사용할 수 없습니다.'] }],
  },
  TARGET_NOT_IN_ROOM: {
    status: 403,
    code: 'ITEM_TARGET_NOT_IN_ROOM',
    errors: [{ field: 'targetUserId', reason: ['대상이 현재 방에 없습니다.'] }],
  },
} as const;
