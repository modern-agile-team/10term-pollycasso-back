export const ERROR_CODES = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  SOLO_MODE_PLAYERS: 'SOLO_MODE_PLAYERS',
  TEAM_MODE_PLAYERS: 'TEAM_MODE_PLAYERS',
  PRIVATE_ROOM_NEEDS_PASSWORD: 'PRIVATE_ROOM_NEEDS_PASSWORD',
} as const;

export const DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  SOLO_MODE_PLAYERS: {
    field: 'maxPlayers',
    reason: 'Solo mode allows 3-6 players only',
  },
  TEAM_MODE_PLAYERS: {
    field: 'maxPlayers',
    reason: 'Team mode allows 4 or 6 players only',
  },
  PRIVATE_ROOM_NEEDS_PASSWORD: {
    field: 'password',
    reason: 'Private room requires a password',
  },
};

export const ROOM_CONSTANTS = {
  ROOMS_PER_PAGE: 6,
  SOLO_MIN_PLAYERS: 3,
  SOLO_MAX_PLAYERS: 6,
  TEAM_ALLOWED_PLAYERS: [4, 6],
  INITIAL_CURRENT_PLAYERS: 0,
} as const;
