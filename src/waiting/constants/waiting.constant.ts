export const WAITING_ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  ACCESS_TOKEN_MISSING: 'ACCESS_TOKEN_MISSING',
  EXPIRED_ACCESS_TOKEN: 'EXPIRED_ACCESS_TOKEN',
  INVALID_ACCESS_TOKEN: 'INVALID_ACCESS_TOKEN',
  CLIENT_STATE_INVALID: 'CLIENT_STATE_INVALID',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  GAME_START_NOT_HOST: 'GAME_START_NOT_HOST',
  HOST_CANNOT_TOGGLE_READY: 'HOST_CANNOT_TOGGLE_READY',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  ROOM_PASSWORD_REQUIRED: 'ROOM_PASSWORD_REQUIRED',
  ROOM_INVALID_PASSWORD: 'ROOM_INVALID_PASSWORD',
  ROOM_FULL: 'ROOM_FULL',
  ROOM_KICKED: 'ROOM_KICKED',
  ALREADY_JOINED: 'ALREADY_JOINED',
  CANNOT_KICK_SELF: 'CANNOT_KICK_SELF',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  GAME_START_NOT_ENOUGH_PLAYERS: 'GAME_START_NOT_ENOUGH_PLAYERS',
  NOT_ALL_PLAYERS_READY: 'NOT_ALL_PLAYERS_READY',
  TEAM_FULL: 'TEAM_FULL',
  SOLO_MODE_NO_TEAMS: 'SOLO_MODE_NO_TEAMS',
  INVALID_TEAM: 'INVALID_TEAM',
  TEAM_IMBALANCE: 'TEAM_IMBALANCE',
  MAX_PLAYERS_LESS_THAN_CURRENT: 'MAX_PLAYERS_LESS_THAN_CURRENT',
  GAME_START_FAILED: 'GAME_START_FAILED',
  TARGET_OFFLINE: 'TARGET_OFFLINE',
} as const;

export const WAITING_DOMAIN_ERRORS: Record<string, { field: string; reason: string }> = {
  ROOM_PASSWORD_REQUIRED: {
    field: 'password',
    reason: 'Password is required for private room',
  },
  CANNOT_KICK_SELF: {
    field: 'targetUserId',
    reason: 'Cannot kick yourself',
  },
  SOLO_MODE_NO_TEAMS: {
    field: 'mode',
    reason: 'Solo mode does not support teams',
  },
  INVALID_TEAM: {
    field: 'team',
    reason: 'Invalid team selection',
  },
  MAX_PLAYERS_LESS_THAN_CURRENT: {
    field: 'maxPlayers',
    reason: 'Cannot set max players less than current player count',
  },
} as const;

export const WAITING_DOMAIN_ERROR_META = {
  ROOM_NOT_FOUND: {
    name: 'RoomNotFoundError',
    message: (roomId: number) => `Room not found: roomId=${roomId}`,
  },
  GAME_ALREADY_STARTED: {
    name: 'RoomAlreadyStartedError',
    message: (roomId: number) => `Room already started or not in waiting state: roomId=${roomId}`,
  },
  GAME_START_NOT_ENOUGH_PLAYERS: {
    name: 'NoPlayersToStartError',
    message: () => 'Not enough players to start game',
  },
} as const;

export const WAITING_CONSTANTS = {
  GAME_SESSION_TTL_SECONDS: 3600,
  DEFAULT_PLAYER_LEVEL: 1,
  LOADING_PHASE_DURATION_MS: 5000,
  DEFAULT_ROUNDS: 3,
  REDIS_KEY_TTL_SECONDS: 3600,
} as const;

export const WAITING_EVENTS = {
  ROOM_JOIN: 'room:join',
  ROOM_READY_TOGGLE: 'room:readyToggle',
  ROOM_CHANGE_TEAM: 'room:changeTeam',
  ROOM_UPDATE_STATUS: 'room:updateStatus',
  ROOM_UPDATE_OUTFIT: 'room:updateOutfit',
  ROOM_UPDATE_SETTINGS: 'room:updateSettings',
  ROOM_KICK_USER: 'room:kickUser',
  ROOM_NUDGE_USER: 'room:nudgeUser',
  ROOM_LEAVE: 'room:leave',
  GAME_START_REQUEST: 'game:startRequest',
  ROOM_SYNC_PLAYER_LIST: 'room:syncPlayerList',
  ROOM_SYSTEM_MESSAGE: 'room:systemMessage',
  ROOM_JOIN_SUCCESS: 'room:joinSuccess',
  ROOM_UPDATE_PLAYER: 'room:updatePlayer',
  ROOM_ALL_PLAYERS_READY: 'room:allPlayersReady',
  ROOM_UPDATE_ROOM: 'room:updateRoom',
  ROOM_UPDATE_GAME_STATE: 'room:updateGameState',
  ROOM_SEND: 'room:send',
  ROOM_MESSAGE: 'room:message',
  ROOM_NUDGED: 'room:nudged',
  SYSTEM_NOTIFICATION: 'system:notification',
} as const;
