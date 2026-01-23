import { GamePhase, type PhaseContext } from '../../interfaces/game-state.interface';

export class GameStateResponseDto {
  phase: GamePhase;

  endsAt: number | null;

  phaseContext: PhaseContext;

  constructor(data: { phase: GamePhase; endsAt: number | null; phaseContext: PhaseContext }) {
    this.phase = data.phase;
    this.endsAt = data.endsAt;
    this.phaseContext = data.phaseContext;
  }
}
