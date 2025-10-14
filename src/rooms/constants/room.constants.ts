export const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: (id: number) => `${id}번 방이 존재하지 않습니다.`,
  SOLO_MODE_PLAYERS: 'SOLO 모드는 3~6명이어야 합니다.',
  TEAM_MODE_PLAYERS: 'TEAM 모드는 4명 또는 6명이어야 합니다.',
  PRIVATE_ROOM_NEEDS_PASSWORD: '비공개 방은 비밀번호가 필요합니다.',
  PUBLIC_ROOM_NO_PASSWORD: '공개 방은 비밀번호를 설정할 수 없습니다.',
} as const;

export const ROOM_CONSTANTS = {
  ROOMS_PER_PAGE: 6,
  SOLO_MIN_PLAYERS: 3,
  SOLO_MAX_PLAYERS: 6,
  TEAM_ALLOWED_PLAYERS: [4, 6],
  INITIAL_CURRENT_PLAYERS: 0,
} as const;
