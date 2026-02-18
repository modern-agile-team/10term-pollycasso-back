import { DrawData } from 'src/game/drawing/interface/drawing.interface';

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
export interface DrawingContext {
  kind: GamePhase.DRAWING;
  activeUserIds: number[];
  readyUserIds: number[];
  phaseInstanceId?: string;
}

export interface EvaluatingContext {
  kind: GamePhase.EVALUATING;
  activeUserIds: number[];
  readyUserIds: number[];
}

export interface RoundRankItem {
  roomMemberId: number;
  nickname: string;

  drawingId: string;
  score: number;
  totalScore: number;
}

export interface RoundSummaryPhaseContext {
  kind: GamePhase.ROUND_SUMMARY;
  rankings: RoundRankItem[];
  drawingsById: Record<string, DrawData>;
}

export type PhaseContext =
  | ThemeSelectPhaseContext
  | DrawingContext
  | EvaluatingContext
  | RoundSummaryPhaseContext
  | null;

export interface GameState {
  phase: GamePhase;
  endsAt: number | null;
  currentRound: number | null;
  totalRounds: number | null;
  matchId: number;
  roomMemberIdByUserId: Record<number, number>;
  currentTheme: string | null;
  recentThemes: string[];
  totalScores: Record<string, number>;
  phaseContext: PhaseContext;
}

export interface IGameStateStore {
  get(roomId: number): Promise<GameState | null>;
  set(roomId: number, state: GameState): Promise<void>;
  patch(roomId: number, partial: Partial<GameState>): Promise<GameState | null>;
  delete(roomId: number): Promise<void>;
}
