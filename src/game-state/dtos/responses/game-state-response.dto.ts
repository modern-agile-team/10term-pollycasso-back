import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  GamePhase,
  type PhaseContext,
  ThemeSelectPhaseContext,
  EvaluatingContext,
} from '../../interfaces/game-state.interface';

export class GameStateResponseDto {
  @ApiProperty({
    description: '현재 게임 페이즈',
    example: GamePhase.DRAWING,
    enum: GamePhase,
  })
  phase: GamePhase;

  @ApiProperty({
    description: '페이즈 종료 시간 (타임스탬프)',
    example: 1704067200000,
    nullable: true,
  })
  endsAt: number | null;

  @ApiProperty({
    description: '페이즈별 컨텍스트 데이터',
    example: { kind: 'THEME_SELECTING', selectorId: 1, selectorNickname: '폴리' },
    oneOf: [
      { $ref: getSchemaPath(ThemeSelectPhaseContext) },
      { $ref: getSchemaPath(EvaluatingContext) },
    ],
    nullable: true,
  })
  phaseContext: PhaseContext;

  constructor(data: { phase: GamePhase; endsAt: number | null; phaseContext: PhaseContext }) {
    this.phase = data.phase;
    this.endsAt = data.endsAt;
    this.phaseContext = data.phaseContext;
  }
}
