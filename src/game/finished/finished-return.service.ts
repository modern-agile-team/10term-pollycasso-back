import { Inject, Injectable, Logger } from '@nestjs/common';
import { GAME_EVENT_PUBLISHER } from 'src/game/interfaces/game-event-publisher.interfaces';
import type { IGameEventPublisher } from 'src/game/interfaces/game-event-publisher.interfaces';
import {
  GAME_STATE_STORE,
  GamePhase,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import { FinishedRepository } from './finished.repository';

const FINISHED_HOLD_MS = 8000;

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

    const t = setTimeout(() => {
      void this.returnToWaiting(roomId);
    }, FINISHED_HOLD_MS);

    this.timersByRoomId.set(roomId, t);
  }

  cancel(roomId: number) {
    const t = this.timersByRoomId.get(roomId);
    if (t) {
      clearTimeout(t);
      this.timersByRoomId.delete(roomId);
    }
  }

  private async returnToWaiting(roomId: number) {
    try {
      const current = await this.gameStateStore.get(roomId);
      if (!current || current.phase !== GamePhase.FINISHED) return;

      const patched = await this.gameStateStore.patch(roomId, {
        phase: GamePhase.WAITING,
        endsAt: null,
        phaseContext: null,
        currentTheme: null,
      });
      if (!patched) return;

      await this.finishedRepository.resetRoomToWaiting(roomId);

      this.eventPublisher.broadcastGameState(roomId, patched);
    } catch (e) {
      if (e instanceof Error) {
        this.logger.error({ roomId, message: e.message, stack: e.stack }, 'returnToWaiting failed');
      } else {
        this.logger.error({ roomId, e }, 'returnToWaiting failed (non-Error thrown)');
      }
    } finally {
      this.cancel(roomId);
    }
  }
}
