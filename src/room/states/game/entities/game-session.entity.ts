import { GAME_ERRORS } from '../constants/game.constant';
import { GamePhase, GameState } from '../interfaces/game-state-store.interfaces';

export class GameSessionEntity {
  private constructor(private _state: GameState) {}

  static restore(state: GameState): GameSessionEntity {
    return new GameSessionEntity({ ...state, recentThemes: state.recentThemes ?? [] });
  }

  get state(): Readonly<GameState> {
    return this._state;
  }
  get currentTheme(): string {
    if (!this._state.currentTheme) {
      throw new Error(GAME_ERRORS.THEME_NOT_SET);
    }
    return this._state.currentTheme;
  }

  startThemeSelection(selectorId: number, selectorNickname?: string): void {
    if (this._state.phase !== GamePhase.LOADING) {
      throw new Error(GAME_ERRORS.PHASE_MUST_BE_LOADING);
    }

    this._state.phase = GamePhase.THEME_SELECTING;
    this._state.endsAt = Date.now() + 32000;

    this._state.currentTheme = null;

    this._state.phaseContext = {
      kind: GamePhase.THEME_SELECTING,
      selectorId,
      selectorNickname,
    };
  }

  startDrawing(userId: number, theme: string): void {
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

    const trimmed = (theme ?? '').trim();
    if (!trimmed) {
      throw new Error(GAME_ERRORS.THEME_INVALID);
    }

    this._state.phase = GamePhase.DRAWING;
    this._state.currentTheme = trimmed;
    this._state.endsAt = Date.now() + 92000;

    this._state.currentRound = 1;
    this._state.totalRounds = 3;
    this._state.phaseContext = null;
  }

  pickRandomTheme(pool: string[]): string {
    const recent = this._state.recentThemes || [];

    const candidates = pool.filter((t) => !recent.includes(t));
    const finalPool = candidates.length > 0 ? candidates : pool;

    const idx = Math.floor(Math.random() * finalPool.length);
    const selected = finalPool[idx];

    const nextRecent = [selected, ...recent].slice(0, 3);

    this._state.recentThemes = nextRecent;

    return selected;
  }
}
