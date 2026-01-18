export enum GamePhase {
  WAITING = 'WAITING',
  LOADING = 'LOADING',
  THEME_SELECTING = 'THEME_SELECTING',
  DRAWING = 'DRAWING',
  EVALUATING = 'EVALUATING',
  ROUND_SUMMARY = 'ROUND_SUMMARY',
  FINISHED = 'FINISHED',
}

export class ThemeSelectPhaseContext {
  kind: GamePhase.THEME_SELECTING;
  selectorId: number;
  selectorNickname?: string;
}

export class EvaluatingContext {
  kind: GamePhase.EVALUATING;
  votes: Record<number, number>;
}

export type PhaseContext = ThemeSelectPhaseContext | EvaluatingContext | null;

export interface GameState {
  phase: GamePhase;
  endsAt: number | null;
  currentRound: number | null;
  totalRounds: number | null;
  currentTheme: string | null;
  recentThemes: string[];
  phaseContext: PhaseContext;
}
