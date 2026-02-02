import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

    const client = await this.getRedisClient();
    const key = this.strokeListKey(roomId, round, userId);

    await client.rpush(key, JSON.stringify(line));
    await client.expire(key, ttlSeconds);
  }

  async loadStrokes(params: {
    roomId: number;
    round: number;
    userId: number;
  }): Promise<DrawLine[]> {
    const { roomId, round, userId } = params;

    const client = await this.getRedisClient();
    const key = this.strokeListKey(roomId, round, userId);

    const raw: string[] = (await client.lrange(key, 0, -1)) ?? [];
    const lines: DrawLine[] = raw
      .map((s) => {
        try {
          return JSON.parse(s) as DrawLine;
        } catch {
          return null;
        }
      })
      .filter((v): v is DrawLine => !!v);

    return lines;
  }

  async cleanupStrokes(params: {
    roomId: number;
    round: number;
    userIds: number[];
  }): Promise<void> {
    const { roomId, round, userIds } = params;

    const client = await this.getRedisClient();
    for (const uid of userIds) {
      await client.del(this.strokeListKey(roomId, round, uid));
    }
  }

  private async getRedisClient(): Promise<any> {
    const client: any =
      (this.redisService as any).client ?? (this.redisService as any).getClient?.();
    if (!client) throw new InternalServerErrorException();
    return client;
  }

  private strokeListKey(roomId: number, round: number, userId: number) {
    return `game:drawing:${roomId}:round:${round}:user:${userId}:strokes`;
  }
}
