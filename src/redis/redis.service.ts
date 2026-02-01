import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly client: Redis) {}

  async set(key: string, value: string, ttlSeconds?: number) {
    if (ttlSeconds) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  async get(key: string) {
    return this.client.get(key);
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (!keys.length) return [];
    return this.client.mget(...keys);
  }

  async del(key: string) {
    return this.client.del(key);
  }
}
