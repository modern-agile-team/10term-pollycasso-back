import { Injectable } from '@nestjs/common';
import { IGameStateStore, GameState, GamePhase } from '../interfaces/game-state-store.interfaces';

function defaultState(): GameState {
  return {
    phase: GamePhase.WAITING,
    endsAt: null,
    currentRound: null,
    totalRounds: null,
    phaseContext: null,
    currentTheme: null,
  };
}

@Injectable()
export class InMemoryGameStateStore implements IGameStateStore {
  private readonly map = new Map<number, GameState>();

  async get(roomId: number): Promise<GameState | null> {
    return this.map.get(roomId) ?? null;
  }

  async set(roomId: number, state: GameState): Promise<void> {
    this.map.set(roomId, { ...state });
  }

  async patch(roomId: number, partial: Partial<GameState>): Promise<GameState> {
    const prev = this.map.get(roomId) ?? defaultState();

    const next: GameState = {
      ...prev,
      ...partial,
      phaseContext: partial.phaseContext === undefined ? prev.phaseContext : partial.phaseContext,
    };

    this.map.set(roomId, next);
    return next;
  }

  async clear(roomId: number): Promise<void> {
    this.map.delete(roomId);
  }
}
