import { Inject, Injectable, Logger } from '@nestjs/common';
import { GAME_EVENT_PUBLISHER } from 'src/game/interfaces/game-event-publisher.interfaces';
import type { IGameEventPublisher } from 'src/game/interfaces/game-event-publisher.interfaces';
import {
  GAME_STATE_STORE,
  GamePhase,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import { FinishedRepository } from './finished.repository';

const FINISHED_HOLD_MS = 8000; // 8초

@Injectable()
export class FinishedReturnService {
  private readonly logger = new Logger(FinishedReturnService.name);
  private readonly timersByRoomId = new Map<number, NodeJS.Timeout>();

  constructor(
    private readonly finishedRepository: FinishedRepository,
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
    @Inject(GAME_EVENT_PUBLISHER) private readonly eventPublisher: IGameEventPublisher,
  ) {}

  schedule(roomId: number) {
    this.cancel(roomId);

    const timeoutId = setTimeout(() => {
      void this.returnToWaiting(roomId);
    }, FINISHED_HOLD_MS);

    this.timersByRoomId.set(roomId, timeoutId);
  }

  cancel(roomId: number) {
    const timeoutId = this.timersByRoomId.get(roomId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timersByRoomId.delete(roomId);
    }
  }

  private async returnToWaiting(roomId: number) {
    try {
      const currentState = await this.gameStateStore.get(roomId);
      if (!currentState || currentState.phase !== GamePhase.FINISHED) return;

      const patchedState = await this.gameStateStore.patch(roomId, {
        phase: GamePhase.WAITING,
        endsAt: null,
        phaseContext: null,
        currentTheme: null,
      });
      if (!patchedState) return;

      await this.finishedRepository.resetRoomToWaiting(roomId);

      this.eventPublisher.broadcastGameState(roomId, patchedState);
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(
          { roomId, message: error.message, stack: error.stack },
          'returnToWaiting failed',
        );
      } else {
        this.logger.error({ roomId, error, message: String(error) }, 'returnToWaiting failed');
      }
      throw error;
    } finally {
      this.cancel(roomId);
    }
  }
}
