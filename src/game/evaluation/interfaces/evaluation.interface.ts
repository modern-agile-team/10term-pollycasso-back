export type PlayerId = number;
export type DrawingId = string;

export interface EvaluationSubmitPayload {
  drawingId: DrawingId;
  score: number;
}

export interface EvaluationRoomState {
  evaluations: Map<PlayerId, Map<DrawingId, number>>;
  isPhaseEnded: boolean;
  evaluationTimer: NodeJS.Timeout | null;
}

export interface EvaluationRoomLike {
  evaluationState?: EvaluationRoomState;
}

export interface AckResponse {
  ok: boolean;
  code?: string;
  allReady?: boolean;
}
