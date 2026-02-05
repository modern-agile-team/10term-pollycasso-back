import { Injectable } from '@nestjs/common';
import { GameItemRepository } from '../repositories/game-item.repository';
import { ItemSpecDto } from '../interfaces/item.interface';

@Injectable()
export class ItemSpecCacheService {
  private cache = new Map<number, ItemSpecDto>();
  private loadedAt = 0;

  private readonly ttlMs = 60000; //60초

  constructor(private readonly repo: GameItemRepository) {}

  async get(itemId: number): Promise<ItemSpecDto | null> {
    const now = Date.now();
    if (now - this.loadedAt > this.ttlMs || this.cache.size === 0) {
      await this.reload();
    }
    return this.cache.get(itemId) ?? null;
  }

  async reload() {
    const specs = await this.repo.findAllSpecs();
    const next = new Map<number, ItemSpecDto>();
    for (const s of specs) next.set(s.id, s);
    this.cache = next;
    this.loadedAt = Date.now();
  }
}
