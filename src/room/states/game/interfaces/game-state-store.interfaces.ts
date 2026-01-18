export const GAME_STATE_STORE = Symbol('GAME_STATE_STORE');

export enum GamePhase {
  WAITING = 'WAITING',
  LOADING = 'LOADING',
  THEME_SELECTING = 'THEME_SELECTING',
  DRAWING = 'DRAWING',
  EVALUATING = 'EVALUATING',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  FINISHED = 'FINISHED',
}

export interface ThemeSelectPhaseContext {
  kind: GamePhase.THEME_SELECTING;
  selectorId: number;
  selectorNickname?: string;
}

export interface EvaluatingContext {
  kind: GamePhase.EVALUATING;
  votes: Record<number, number>;
}

export type PhaseContext = ThemeSelectPhaseContext | EvaluatingContext | null;

export interface GameState {
  phase: GamePhase;
  endsAt: number | null;
  currentRound: number | null;
  totalRounds: number | null;
  currentTheme?: string;
  recentThemes: string[];
  phaseContext: PhaseContext;
}

export interface IGameStateStore {
  get(roomId: number): Promise<GameState | null>;
  set(roomId: number, state: GameState): Promise<void>;
  patch(roomId: number, partial: Partial<GameState>): Promise<GameState>;
  clear(roomId: number): Promise<void>;
}
