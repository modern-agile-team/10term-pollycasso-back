export const GAME_EVENT_PUBLISHER = Symbol('GAME_EVENT_PUBLISHER');

export interface IGameEventPublisher {
  broadcastGameState(roomId: number, payload: unknown): void;
  emitThemeConfirmed(roomId: number, theme: string): void;
}
