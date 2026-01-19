import { Inject, Injectable } from '@nestjs/common';
import { GAME_STATE_STORE, GamePhase } from '../interfaces/game-state-store.interfaces';
import { GAME_EVENT_PUBLISHER } from '../interfaces/game-event-publisher.interfaces';
import type { IGameStateStore } from '../interfaces/game-state-store.interfaces';
import type { IGameEventPublisher } from '../interfaces/game-event-publisher.interfaces';
import { TopicService } from '../topic/topic.service';
import { GameSessionEntity } from '../entities/game-session.entity';
import { RANDOM_THEMES } from '../topic/constants/topic.constant';
import { GAME_ERRORS } from '../constants/game.constant';

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

    setTimeout(() => {
      void (async () => {
        const current = await this.gameStateStore.get(roomId);
        if (!current || current.phase !== GamePhase.LOADING) return;

        const themeContext = await this.topicService.buildThemeSelectionContext(roomId);
        if (!themeContext) return;

        const { selectorId, selectorNickname } = themeContext;

        try {
          const entity = GameSessionEntity.restore(current);
          entity.startThemeSelection(selectorId, selectorNickname);

          const nextState = entity.state;

          await this.gameStateStore.set(roomId, nextState);
          this.eventPublisher.broadcastGameState(roomId, nextState);
        } catch (e) {
          if (e instanceof Error && e.message === GAME_ERRORS.PHASE_MUST_BE_LOADING) return;
          console.error(`[startTopicPhase] Error in room ${roomId}:`, e);
        }
      })();
    }, delay);
  }

  // 주제 확정 및 DRAWING 단계 시작 처리
  async startDrawingPhase(roomId: number, userId: number, typedValue: string) {
    const state = await this.gameStateStore.get(roomId);
    if (!state) return null;

    const entity = GameSessionEntity.restore(state);

    const trimmed = (typedValue ?? '').trim();

    const theme = trimmed ? trimmed : entity.pickRandomTheme(RANDOM_THEMES);

    entity.startDrawing(userId, theme);

    const nextState = entity.state;

    await this.gameStateStore.set(roomId, nextState);

    this.eventPublisher.emitThemeConfirmed(roomId, entity.getConfirmedTheme());
    this.eventPublisher.broadcastGameState(roomId, nextState);

    return nextState;
  }
}
