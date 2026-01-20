import { Injectable } from '@nestjs/common';
import { GameState } from './interfaces/game-state.interface';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class GameStateStore {
  constructor(private readonly redis: RedisService) {}

  private getKey(roomId: number): string {
    return `game:state:${roomId}`;
  }

  async get(roomId: number): Promise<GameState | null> {
    const data = await this.redis.get(this.getKey(roomId));
    if (!data) return null;
    return JSON.parse(data) as GameState;
  }

  async set(roomId: number, state: GameState): Promise<void> {
    await this.redis.set(this.getKey(roomId), JSON.stringify(state), 3600);
  }

  async patch(roomId: number, partial: Partial<GameState>): Promise<GameState | null> {
    const current = await this.get(roomId);
    if (!current) return null;

    const updated: GameState = { ...current, ...partial };
    await this.set(roomId, updated);
    return updated;
  }

  async delete(roomId: number): Promise<void> {
    await this.redis.del(this.getKey(roomId));
  }
}
