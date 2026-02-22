import {
  DrawingContext,
  GamePhase,
  GameState,
} from 'src/game-state/interfaces/game-state.interface';
import { GAME_ERRORS } from '../constants/game.constant';
import { randomUUID } from 'crypto';

export class GameSessionEntity {
  private constructor(private _state: GameState) {}

  static restore(state: GameState): GameSessionEntity {
    const cloned = structuredClone(state);
    return new GameSessionEntity({ ...cloned, recentThemes: cloned.recentThemes ?? [] });
  }

  get state(): Readonly<GameState> {
    return structuredClone(this._state);
  }

  get currentTheme(): string | null {
    return this._state.currentTheme;
  }

  get currentPhaseInstanceId(): string {
    const ctx = this._state.phaseContext;
    if (ctx?.kind !== GamePhase.DRAWING || !ctx.phaseInstanceId) {
      throw new Error(GAME_ERRORS.CONTEXT_INVALID);
    }
    return ctx.phaseInstanceId;
  }

  getConfirmedTheme(): string {
    const theme = this._state.currentTheme;
    if (!theme) {
      throw new Error(GAME_ERRORS.THEME_NOT_SET);
    }
    return theme;
  }

  startThemeSelection(selectorId: number, selectorNickname?: string): void {
    if (this._state.phase !== GamePhase.LOADING) {
      throw new Error(GAME_ERRORS.PHASE_MUST_BE_LOADING);
    }

    this._state.phase = GamePhase.THEME_SELECTING;
    this._state.endsAt = Date.now() + 32000; // 32초

    this._state.currentTheme = null;

    this._state.phaseContext = {
      kind: GamePhase.THEME_SELECTING,
      selectorId,
      selectorNickname,
    };
  }

  startDrawing(userId: number, theme: string, activeUserIds: number[]): void {
    if (this._state.phase !== GamePhase.THEME_SELECTING) {
      throw new Error(GAME_ERRORS.PHASE_MUST_BE_THEME_SELECTING);
    }

    const context = this._state.phaseContext;

    if (!context || context.kind !== GamePhase.THEME_SELECTING) {
      throw new Error(GAME_ERRORS.CONTEXT_INVALID);
    }

    if (context.selectorId !== userId) {
      throw new Error(GAME_ERRORS.PERMISSION_DENIED_SELECTOR);
    }

    const trimmedTheme = theme.trim();
    if (!trimmedTheme) {
      throw new Error(GAME_ERRORS.THEME_INVALID);
    }

    this._state.phase = GamePhase.DRAWING;
    this._state.currentTheme = trimmedTheme;
    this._state.endsAt = Date.now() + 92000; // 92초

    if (!this._state.currentRound) this._state.currentRound = 1;
    if (!this._state.totalRounds) this._state.totalRounds = 3;

    const drawingContext: DrawingContext = {
      kind: GamePhase.DRAWING,
      phaseInstanceId: randomUUID(),
      activeUserIds: [...activeUserIds],
      readyUserIds: [],
    };
    this._state.phaseContext = drawingContext;

    const currentRecent = this._state.recentThemes ?? [];
    this._state.recentThemes = [trimmedTheme, ...currentRecent].slice(0, 3);
  }

  pickRandomTheme(pool: string[]): string {
    const recent = this._state.recentThemes || [];

    const candidates = pool.filter((t) => !recent.includes(t));
    const finalPool = candidates.length > 0 ? candidates : pool;

    const idx = Math.floor(Math.random() * finalPool.length);
    const selected = finalPool[idx];

    return selected;
  }

  isDrawing(): boolean {
    return this._state.phase === GamePhase.DRAWING;
  }

  getDrawingPhaseInstanceId(): string {
    return this.currentPhaseInstanceId;
  }

  advanceToThemeSelecting(params: {
    themeSelectingEndsAt: number;
    themeSelection: { selectorId: number; selectorNickname: string };
  }): { nextState: GameState } {
    if (this._state.phase !== GamePhase.ROUND_SUMMARY) {
      throw new Error(GAME_ERRORS.CONTEXT_INVALID);
    }

    const currentRound = this._state.currentRound ?? 1;
    const totalRounds = this._state.totalRounds ?? 3;
    const isLastRound = totalRounds > 0 && currentRound >= totalRounds;

    if (isLastRound) {
      throw new Error(GAME_ERRORS.CONTEXT_INVALID);
    }

    const { themeSelectingEndsAt, themeSelection } = params;
    const { selectorId, selectorNickname } = themeSelection;
    this._state.currentTheme = null;
    this._state.endsAt = null;
    this._state.phaseContext = null;

    this._state.currentRound = currentRound + 1;
    this._state.phase = GamePhase.THEME_SELECTING;
    this._state.endsAt = themeSelectingEndsAt;
    this._state.phaseContext = {
      kind: GamePhase.THEME_SELECTING,
      selectorId,
      selectorNickname,
    };

    return { nextState: this.state };
  }

  advanceToFinished(): { nextState: GameState } {
    if (this._state.phase !== GamePhase.ROUND_SUMMARY) {
      throw new Error(GAME_ERRORS.CONTEXT_INVALID);
    }

    this._state.currentTheme = null;
    this._state.endsAt = null;
    this._state.phaseContext = null;
    this._state.phase = GamePhase.FINISHED;

    return { nextState: this.state };
  }
}
