import { Injectable } from '@nestjs/common';

type ItemState = { initial: number; remaining: number };

@Injectable()
export class GameInventoryStore {
  private inv = new Map<string, Map<number, Map<number, ItemState>>>();

  private phase(phaseKey: string) {
    const p = this.inv.get(phaseKey) ?? new Map<number, Map<number, ItemState>>();
    if (!this.inv.has(phaseKey)) this.inv.set(phaseKey, p);
    return p;
  }

  private user(phaseKey: string, userId: number) {
    const p = this.phase(phaseKey);
    const u = p.get(userId) ?? new Map<number, ItemState>();
    if (!p.has(userId)) p.set(userId, u);
    return u;
  }

  initUser(phaseKey: string, userId: number, items: Array<{ itemId: number; quantity: number }>) {
    const u = this.user(phaseKey, userId);
    for (const it of items) {
      u.set(it.itemId, { initial: it.quantity, remaining: it.quantity });
    }
  }

  getRemaining(phaseKey: string, userId: number, itemId: number): number {
    const u = this.user(phaseKey, userId);
    return u.get(itemId)?.remaining ?? 0;
  }

  decrement(phaseKey: string, userId: number, itemId: number): number {
    const u = this.user(phaseKey, userId);
    const st = u.get(itemId) ?? { initial: 0, remaining: 0 };
    if (!u.has(itemId)) u.set(itemId, st);
    if (st.remaining > 0) st.remaining -= 1;
    return st.remaining;
  }

  extractUsed(phaseKey: string): Array<{ userId: number; itemId: number; used: number }> {
    const p = this.inv.get(phaseKey);
    if (!p) return [];

    const out: Array<{ userId: number; itemId: number; used: number }> = [];
    for (const [userId, u] of p.entries()) {
      for (const [itemId, st] of u.entries()) {
        const used = Math.max(0, st.initial - st.remaining);
        if (used > 0) out.push({ userId, itemId, used });
      }
    }
    return out;
  }

  clear(phaseKey: string) {
    this.inv.delete(phaseKey);
  }
}
