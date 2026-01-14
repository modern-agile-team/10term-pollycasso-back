import { Inject, Injectable } from '@nestjs/common';
import { GAME_STATE_STORE, GamePhase } from '../interfaces/game-state-store.interfaces';
import { GAME_EVENT_PUBLISHER } from '../interfaces/game-event-publisher.interfaces';
import type { IGameStateStore } from '../interfaces/game-state-store.interfaces';
import type { IGameEventPublisher } from '../interfaces/game-event-publisher.interfaces';
import { TopicService } from '../topic/topic.service';

@Injectable()
export class GameSessionService {
  constructor(
    private readonly topicService: TopicService,
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
    @Inject(GAME_EVENT_PUBLISHER) private readonly eventPublisher: IGameEventPublisher,
  ) {}

  // TOPIC 자동 전환 처리
  async startTopicPhase(roomId: number) {
    const state = await this.gameStateStore.get(roomId);
    if (!state || state.phase !== GamePhase.LOADING || !state.endsAt) return;

    const delay = Math.max(0, state.endsAt - Date.now());

    setTimeout(async () => {
      const current = await this.gameStateStore.get(roomId);

      if (!current || current.phase !== GamePhase.LOADING) return;

      const themeContext = await this.topicService.buildThemeSelectionContext(roomId);
      if (!themeContext) return;

      const { selectorId, selectorNickname } = themeContext;

      const next = await this.gameStateStore.patch(roomId, {
        phase: GamePhase.THEME_SELECTING,
        endsAt: Date.now() + 32000,
        phaseContext: { kind: GamePhase.THEME_SELECTING, selectorId, selectorNickname },
      });

      this.eventPublisher.broadcastGameState(roomId, next);
    }, delay);
  }

  // 주제 확정 및 DRAWING 단계 시작 처리
  async startDrawingPhase(roomId: number, currentTheme: string) {
    const nextState = await this.gameStateStore.patch(roomId, {
      phase: GamePhase.DRAWING,
      endsAt: Date.now() + 60000,
      currentTheme,
      currentRound: 1,
      totalRounds: 3,
      phaseContext: null,
    });

    this.eventPublisher.emitThemeConfirmed(roomId, currentTheme);
    this.eventPublisher.broadcastGameState(roomId, nextState);

    return nextState;
  }
}
