import { ConflictException } from '@nestjs/common';
import { DrawingContext, GamePhase } from 'src/game-state/interfaces/game-state.interface';
import { DRAWING_ERRORS } from '../constants/drawing.constant.js';

export class DrawingPhaseContextEntity {
  private readonly kind: GamePhase.DRAWING;
  private readonly phaseInstanceId?: string;
  private activeUserIds: number[];
  private readyUserIds: number[];

  private constructor(ctx: DrawingContext) {
    this.kind = ctx.kind;
    this.phaseInstanceId = ctx.phaseInstanceId;
    this.activeUserIds = Array.isArray(ctx.activeUserIds) ? [...ctx.activeUserIds] : [];
    this.readyUserIds = Array.isArray(ctx.readyUserIds) ? [...ctx.readyUserIds] : [];
  }

  static from(statePhaseContext: unknown): DrawingPhaseContextEntity {
    const ctx = statePhaseContext as DrawingContext;

    if (!ctx || ctx.kind !== GamePhase.DRAWING) {
      throw new ConflictException(DRAWING_ERRORS.DRAWING_CONTEXT_MISSING);
    }

    return new DrawingPhaseContextEntity({
      kind: GamePhase.DRAWING,
      phaseInstanceId: ctx.phaseInstanceId,
      activeUserIds: Array.isArray(ctx.activeUserIds) ? ctx.activeUserIds : [],
      readyUserIds: Array.isArray(ctx.readyUserIds) ? ctx.readyUserIds : [],
    });
  }

  ensureActive(userId: number): void {
    if (!this.activeUserIds.includes(userId)) {
      throw new ConflictException(DRAWING_ERRORS.USER_NOT_ACTIVE);
    }
  }

  markReady(userId: number): boolean {
    this.ensureActive(userId);

    if (this.readyUserIds.includes(userId)) return false;
    this.readyUserIds.push(userId);
    return true;
  }

  removeUser(userId: number): boolean {
    const wasActive = this.activeUserIds.includes(userId);
    if (!wasActive) return false;

    this.activeUserIds = this.activeUserIds.filter((id) => id !== userId);
    this.readyUserIds = this.readyUserIds.filter((id) => id !== userId);
    return true;
  }

  shouldAdvance(): boolean {
    return this.activeUserIds.length > 0 && this.readyUserIds.length >= this.activeUserIds.length;
  }

  getActiveUserIds(): number[] {
    return [...this.activeUserIds];
  }

  toPlain(): DrawingContext {
    return {
      kind: GamePhase.DRAWING,
      phaseInstanceId: this.phaseInstanceId,
      activeUserIds: [...this.activeUserIds],
      readyUserIds: [...this.readyUserIds],
    };
  }
}
