import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import type { DrawLine } from './interface/drawing.interface';

@Injectable()
export class DrawingStore {
  constructor(private readonly redisService: RedisService) {}

  async appendStroke(params: {
    roomId: number;
    round: number;
    userId: number;
    line: DrawLine;
    ttlSeconds?: number;
  }): Promise<void> {
    const { roomId, round, userId, line, ttlSeconds } = params;
    const key = this.strokeListKey(roomId, round, userId);

    await this.redisService.rpush(key, JSON.stringify(line));

    if (typeof ttlSeconds === 'number') {
      await this.redisService.expire(key, ttlSeconds);
    }
  }

  async loadStrokes(params: {
    roomId: number;
    round: number;
    userId: number;
  }): Promise<DrawLine[]> {
    const { roomId, round, userId } = params;

    const key = this.strokeListKey(roomId, round, userId);

    const raw = (await this.redisService.lrange(key, 0, -1)) ?? [];

    return raw
      .map((s) => {
        try {
          return JSON.parse(s) as DrawLine;
        } catch {
          return null;
        }
      })
      .filter((v): v is DrawLine => v !== null);
  }

  async cleanupStrokes(params: {
    roomId: number;
    round: number;
    userIds: number[];
  }): Promise<void> {
    const { roomId, round, userIds } = params;

    for (const uid of userIds) {
      await this.redisService.del(this.strokeListKey(roomId, round, uid));
    }
  }

  private strokeListKey(roomId: number, round: number, userId: number) {
    return `game:drawing:${roomId}:round:${round}:user:${userId}:strokes`;
  }
}
