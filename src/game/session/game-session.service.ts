import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Server } from 'socket.io';
import { GAME_EVENT_PUBLISHER } from '../interfaces/game-event-publisher.interfaces';
import type { IGameEventPublisher } from '../interfaces/game-event-publisher.interfaces';
import { TopicService } from '../topic/topic.service';
import { GameSessionEntity } from '../entities/game-session.entity';
import { RANDOM_THEMES } from '../topic/constants/topic.constant';
import { GAME_ERRORS, GAME_EVENTS } from '../constants/game.constant';
import {
  GAME_STATE_STORE,
  GamePhase,
  type DrawingContext,
  type IGameStateStore,
} from 'src/game-state/interfaces/game-state.interface';
import { RedisService } from 'src/redis/redis.service';
import type { DrawData } from '../drawing/interface/drawing.interface';

const DRAWING_DURATION_MS = 92000; // 92초
const EVALUATING_DURATION_MS = 60000; // 60초

@Injectable()
export class GameSessionService {
  constructor(
    private readonly topicService: TopicService,
    @Inject(GAME_STATE_STORE) private readonly gameStateStore: IGameStateStore,
    @Inject(GAME_EVENT_PUBLISHER) private readonly eventPublisher: IGameEventPublisher,
    private readonly redis: RedisService,
  ) {}

  @OnEvent(GAME_EVENTS.LOADING_STARTED)
  async handleLoadingStarted(payload: { roomId: number }) {
    await this.startTopicPhase(payload.roomId);
  }

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
        }
      })();
    }, delay);
  }

  // 주제 확정 및 DRAWING 시작
  async startDrawingPhase(roomId: number, userId: number, typedValue: string, server: Server) {
    const state = await this.gameStateStore.get(roomId);
    console.log(state);
    if (!state) return null;

    this.clearTimer(roomId);

    const entity = GameSessionEntity.restore(state);

    const trimmed = (typedValue ?? '').trim();
    const theme = trimmed ? trimmed : entity.pickRandomTheme(RANDOM_THEMES);

    // 현재 연결 유저(active) 계산: room에 붙은 소켓
    const sockets = await server.in(this.roomSocketRoom(roomId)).fetchSockets();
    const connectedUserIds = new Set(
      sockets
        .map((s) => s.data?.userId as number | undefined)
        .filter((id): id is number => typeof id === 'number'),
    );

    const room = this.roomSocketRoom(roomId);
    console.log('[DEBUG] target room =', room);
    const memberUserIds = Object.keys(state.roomMemberIdByUserId).map(Number);
    const activeUserIds = memberUserIds.filter((uid) => connectedUserIds.has(uid));
    console.log(`[DEBUG] Room: ${roomId}`);
    console.log(`[DEBUG] Connected Sockets Count: ${sockets.length}`);
    console.log(`[DEBUG] Connected IDs:`, Array.from(connectedUserIds));
    console.log(`[DEBUG] Final Active User IDs:`, activeUserIds);

    // entity가 DRAWING 컨텍스트까지 만들도록(당신이 합치기로 한 방향)
    entity.startDrawing(userId, theme, activeUserIds);

    const nextState = entity.state;
    await this.gameStateStore.set(roomId, nextState);

    this.eventPublisher.emitThemeConfirmed(roomId, entity.getConfirmedTheme());
    this.eventPublisher.broadcastGameState(roomId, nextState);

    // phaseInstanceId 가드용 값 캡처
    const drawingCtx = nextState.phaseContext;
    const phaseInstanceId =
      drawingCtx && drawingCtx.kind === GamePhase.DRAWING
        ? (drawingCtx as DrawingContext).phaseInstanceId
        : undefined;

    const timer = setTimeout(() => {
      void this.advanceToEvaluating({ roomId, server, expectedPhaseInstanceId: phaseInstanceId });
    }, DRAWING_DURATION_MS);

    this.timers.set(roomId, timer);

    return nextState;
  }

  // advance: DRAWING -> EVALUATING
  async advanceToEvaluating(params: {
    roomId: number;
    server: Server;
    expectedPhaseInstanceId?: string;
  }): Promise<void> {
    const { roomId, server, expectedPhaseInstanceId } = params;

    const state = await this.gameStateStore.get(roomId);
    if (!state || state.phase !== GamePhase.DRAWING) return;
    if (!state.phaseContext || state.phaseContext.kind !== GamePhase.DRAWING) return;

    const drawingCtx = state.phaseContext as DrawingContext;

    if (expectedPhaseInstanceId && drawingCtx.phaseInstanceId !== expectedPhaseInstanceId) {
      return;
    }

    const round = state.currentRound ?? 1;
    const drawingsByUserId = await this.loadAllDrawData(roomId, round);

    const endsAt = Date.now() + EVALUATING_DURATION_MS;

    const evaluatingContext = {
      kind: GamePhase.EVALUATING,
      votes: {},
    };

    const patched = await this.gameStateStore.patch(roomId, {
      phase: GamePhase.EVALUATING,
      endsAt,
      phaseContext: evaluatingContext as any,
    });
    if (!patched) return;

    this.clearTimer(roomId);

    // 1) 상태 변경 브로드캐스트
    server.to(this.roomSocketRoom(roomId)).emit('room:updateGameState', {
      phase: GamePhase.EVALUATING,
      endsAt,
      phaseContext: evaluatingContext,
    });

    // 2) 평가 목록: 소켓별로 "본인 제외"해서 개별 emit
    const sockets = await server.in(this.roomSocketRoom(roomId)).fetchSockets();

    for (const socket of sockets) {
      const viewerUserId = socket.data?.userId as number | undefined;

      if (!viewerUserId) {
        console.warn('[advanceToEvaluating] Socket without userId:', socket.id);
        continue;
      }

      const otherUserIds = Object.keys(drawingsByUserId)
        .map(Number)
        .filter((id) => id !== viewerUserId);

      const shuffled = this.shuffleArray(otherUserIds);

      const drawings = shuffled.map((uid) => ({
        drawData: drawingsByUserId[uid],
      }));

      socket.emit('game:startEvaluation', { drawings });
    }
  }

  private drawingDataKey(roomId: number, round: number) {
    return `game:drawing:${roomId}:round:${round}`;
  }
  private roomSocketRoom(roomId: number) {
    return `game:room:${roomId}`;
  }

  private async loadAllDrawData(roomId: number, round: number): Promise<Record<number, DrawData>> {
    const key = this.drawingDataKey(roomId, round);
    const client: any = (this.redis as any).client ?? (this.redis as any).getClient?.();
    if (!client?.hgetall) throw new ConflictException('REDIS_CLIENT_NOT_READY');

    const map: Record<string, string> = await client.hgetall(key);
    const out: Record<number, DrawData> = {};
    for (const [uid, raw] of Object.entries(map)) {
      try {
        out[Number(uid)] = JSON.parse(raw) as DrawData;
      } catch {}
    }
    return out;
  }

  private timers = new Map<number, NodeJS.Timeout>();

  private clearTimer(roomId: number) {
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
