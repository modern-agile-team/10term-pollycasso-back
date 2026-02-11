export const EVALUATION_EVENTS = {
  GAME_SUBMIT_EVALUATION: 'game:submitEvaluation',
  ROOM_READY_TOGGLE: 'room:readyToggle',
  ROOM_UPDATE_GAME_STATE: 'room:updateGameState',
  SYSTEM_NOTIFICATION: 'system:notification',
} as const;

export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const ROUND_SUMMARY_MS = 32 * 1000;
