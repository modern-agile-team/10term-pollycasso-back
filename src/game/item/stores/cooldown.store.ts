import { Injectable } from '@nestjs/common';

@Injectable()
export class CooldownStore {
  private cooldowns = new Map<string, Map<number, Map<number, number>>>();

  private phase(phaseKey: string) {
    const p = this.cooldowns.get(phaseKey) ?? new Map<number, Map<number, number>>();
    if (!this.cooldowns.has(phaseKey)) this.cooldowns.set(phaseKey, p);
    return p;
  }

  private user(phaseKey: string, userId: number) {
    const p = this.phase(phaseKey);
    const u = p.get(userId) ?? new Map<number, number>();
    if (!p.has(userId)) p.set(userId, u);
    return u;
  }

  getEndsAt(phaseKey: string, userId: number, itemId: number): number {
    return this.user(phaseKey, userId).get(itemId) ?? 0;
  }

  setEndsAt(phaseKey: string, userId: number, itemId: number, endsAt: number) {
    this.user(phaseKey, userId).set(itemId, endsAt);
  }

  clear(phaseKey: string) {
    this.cooldowns.delete(phaseKey);
  }
}
