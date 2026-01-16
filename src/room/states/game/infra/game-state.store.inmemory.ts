import { Injectable } from '@nestjs/common';
import { IGameStateStore, GameState, GamePhase } from '../interfaces/game-state-store.interfaces';

function defaultState(): GameState {
  return {
    phase: GamePhase.WAITING,
    endsAt: null,
    currentRound: null,
    totalRounds: null,
    phaseContext: null,
    currentTheme: undefined,
    recentThemes: [],
  };
}

@Injectable()
export class InMemoryGameStateStore implements IGameStateStore {
  private readonly map = new Map<number, GameState>();

  get(roomId: number): Promise<GameState | null> {
    return Promise.resolve(this.map.get(roomId) ?? null);
  }

  set(roomId: number, state: GameState): Promise<void> {
    this.map.set(roomId, { ...state });
    return Promise.resolve();
  }

  patch(roomId: number, partial: Partial<GameState>): Promise<GameState> {
    const prev = this.map.get(roomId) ?? defaultState();

    const next: GameState = {
      ...prev,
      ...partial,
      phaseContext: partial.phaseContext === undefined ? prev.phaseContext : partial.phaseContext,
      recentThemes: partial.recentThemes === undefined ? prev.recentThemes : partial.recentThemes,
    };

    this.map.set(roomId, next);
    return Promise.resolve(next);
  }

  clear(roomId: number): Promise<void> {
    this.map.delete(roomId);
    return Promise.resolve();
  }
}
