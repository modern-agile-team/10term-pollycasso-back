import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { DefaultEventsMap, RemoteSocket, Server } from 'socket.io';
import { GAME_EVENT_PUBLISHER } from '../interfaces/game-event-publisher.interfaces';
import type { IGameEventPublisher } from '../interfaces/game-event-publisher.interfaces';
import { TopicService } from '../topic/topic.service';
import { GameSessionEntity } from '../entities/game-session.entity';
import { RANDOM_THEMES } from '../topic/constants/topic.constant';
import { GAME_ERRORS, GAME_EVENTS } from '../constants/game.constant';
import {
  EvaluatingContext,
  GAME_STATE_STORE,
  GamePhase,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import type { DrawData } from '../drawing/interface/drawing.interface';
import { DrawingService } from '../drawing/drawing.service';
import { GameSocketData } from '../interfaces/gameSocket.interface';
import { wsError } from 'src/common/utils/ws-error.util';

type GameRemoteSocket = RemoteSocket<DefaultEventsMap, GameSocketData>;

const DRAWING_DURATION_MS = 92000; // 92초
const EVALUATING_DURATION_MS = 60000; // 60초

@Injectable()
export class GameSessionService {
  constructor(
    private readonly topicService: TopicService,
    private readonly drawingService: DrawingService,
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
    @Inject(GAME_EVENT_PUBLISHER) private readonly eventPublisher: IGameEventPublisher,
  ) {}

  // 로딩 시작 -> 주제 선정 예약
  @OnEvent(GAME_EVENTS.LOADING_STARTED)
  async handleLoadingStarted(payload: { roomId: number }) {
    await this.startTopicPhase(payload.roomId);
  }

  // 주제 선정 단계 자동 전환
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
        }
      })();
    }, delay);
  }

  // 주제 확정 및 DRAWING 시작
  async startDrawingPhase(roomId: number, userId: number, typedValue: string, server: Server) {
    const state = await this.gameStateStore.get(roomId);
    if (!state) {
      throw wsError(404, GAME_ERRORS.CONTEXT_INVALID);
    }

    this.clearTimer(roomId);

    const entity = GameSessionEntity.restore(state);

    const trimmed = (typedValue ?? '').trim();
    const theme = trimmed ? trimmed : entity.pickRandomTheme(RANDOM_THEMES);

    const sockets = await this.fetchGameSockets(server, roomId);
    const connectedUserIds = new Set(
      sockets.map((s) => s.data.userId).filter((id): id is number => typeof id === 'number'),
    );

    const memberUserIds = Object.keys(state.roomMemberIdByUserId).map(Number);
    const activeUserIds = memberUserIds.filter((uid) => connectedUserIds.has(uid));

    entity.startDrawing(userId, theme, activeUserIds);

    const nextState = entity.state;
    await this.gameStateStore.set(roomId, nextState);

    const roundId = entity.currentPhaseInstanceId;

    await this.drawingService.startDrawing({
      gameId: roomId.toString(),
      roundId: roundId,
      participantUserIds: activeUserIds,
    });

    this.eventPublisher.emitThemeConfirmed(roomId, entity.getConfirmedTheme());
    this.eventPublisher.broadcastGameState(roomId, nextState);

    const drawingCtx = nextState.phaseContext;
    const phaseInstanceId =
      drawingCtx && drawingCtx.kind === GamePhase.DRAWING ? drawingCtx.phaseInstanceId : undefined;

    const timer = setTimeout(() => {
      void this.advanceToEvaluating({ roomId, server, expectedPhaseInstanceId: phaseInstanceId });
    }, DRAWING_DURATION_MS);

    this.timers.set(roomId, timer);

    return nextState;
  }

  // DRAWING 종료 -> EVALUATING 전환
  async advanceToEvaluating(params: {
    roomId: number;
    server: Server;
    expectedPhaseInstanceId?: string;
  }): Promise<void> {
    const { roomId, server, expectedPhaseInstanceId } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state || state.phase !== GamePhase.DRAWING) return;
    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.DRAWING) return;

    const entity = GameSessionEntity.restore(state);
    const roundId = entity.currentPhaseInstanceId;

    if (expectedPhaseInstanceId && roundId !== expectedPhaseInstanceId) {
      return;
    }

    const round = state.currentRound ?? 1;

    await this.drawingService.endDrawing({
      gameId: roomId.toString(),
      roundId: roundId,
    });

    await this.drawingService.forceCommitForEvaluating({ roomId, round, state });

    const drawingsByUserId: Record<number, DrawData> =
      await this.drawingService.getDrawingsByUserIdForEvaluating({ roomId, round, state });

    const endsAt = Date.now() + EVALUATING_DURATION_MS;

    const evaluatingContext: EvaluatingContext = {
      kind: GamePhase.EVALUATING,
      votes: {},
    };

    const patched = await this.gameStateStore.patch(roomId, {
      phase: GamePhase.EVALUATING,
      endsAt,
      phaseContext: evaluatingContext,
    });
    if (!patched) return;

    this.clearTimer(roomId);

    server.to(this.roomSocketRoom(roomId)).emit('room:updateGameState', {
      phase: GamePhase.EVALUATING,
      endsAt,
      phaseContext: evaluatingContext,
    });

    const sockets = await this.fetchGameSockets(server, roomId);

    for (const socket of sockets) {
      const viewerUserId = socket.data.userId;
      if (!viewerUserId) continue;

      const otherUserIds = Object.keys(drawingsByUserId)
        .map(Number)
        .filter((id) => id !== viewerUserId);

      const shuffled = this.shuffleArray(otherUserIds);

      const drawings = shuffled
        .map((uid) => drawingsByUserId[uid])
        .filter((v): v is DrawData => !!v)
        .map((drawData) => ({ drawData }));

      socket.emit('game:startEvaluation', { drawings });
    }
  }

  async getDrawingPhaseKeyOrThrow(roomId: number): Promise<string> {
    const state = await this.gameStateStore.get(roomId);
    if (!state) {
      throw wsError(400, GAME_ERRORS.CONTEXT_INVALID);
    }

    const entity = GameSessionEntity.restore(state);

    if (state.phase !== GamePhase.DRAWING) {
      throw wsError(400, GAME_ERRORS.CONTEXT_INVALID);
    }

    const roundId = entity.currentPhaseInstanceId;
    return `${roomId}:${roundId}`;
  }

  // Room Name 생성
  private roomSocketRoom(roomId: number) {
    return `game:room:${roomId}`;
  }

  private timers = new Map<number, NodeJS.Timeout>();

  // 타이머 제거
  private clearTimer(roomId: number) {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
  }

  // 소켓들 가져오기
  private async fetchGameSockets(server: Server, roomId: number): Promise<GameRemoteSocket[]> {
    const sockets = await server.in(this.roomSocketRoom(roomId)).fetchSockets();
    return sockets as unknown as GameRemoteSocket[];
  }

  // 배열 셔플
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
