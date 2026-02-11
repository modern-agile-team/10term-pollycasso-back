import type {
  EvaluationRoomState,
  EvaluationSubmitPayload,
  PlayerId,
} from './interfaces/evaluation.interface';

export type EvaluationMemoryStore = Map<number, EvaluationRoomState>;

export function ensureEvaluationState(
  store: EvaluationMemoryStore,
  roomId: number,
): EvaluationRoomState {
  const prev = store.get(roomId);
  if (prev) return prev;

  const created: EvaluationRoomState = {
    evaluations: new Map<PlayerId, Map<string, number>>(),
    isPhaseEnded: false,
    evaluationTimer: null,
  };

  store.set(roomId, created);
  return created;
}

export function upsertEvaluation(
  store: EvaluationMemoryStore,
  roomId: number,
  playerId: PlayerId,
  payload: EvaluationSubmitPayload,
): void {
  const state = ensureEvaluationState(store, roomId);

  const perPlayer = state.evaluations.get(playerId) ?? new Map<string, number>();
  perPlayer.set(payload.drawingId, payload.score);
  state.evaluations.set(playerId, perPlayer);
}
