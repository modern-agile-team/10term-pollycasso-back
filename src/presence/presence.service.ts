import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/redis/redis.service';
import { PRESENCE_EVENTS } from './constants/presence.constant';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PresenceService {
  private readonly ONLINE_STATUS_TTL = 86400;

  constructor(
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async markOnline(userId: number): Promise<void> {
    await this.redisService.set(`user:${userId}:isOnline`, '1', this.ONLINE_STATUS_TTL);
    this.eventEmitter.emit(PRESENCE_EVENTS.STATUS_UPDATED, { userId, isOnline: true });
  }

  async markOffline(userId: number): Promise<void> {
    await this.redisService.del(`user:${userId}:isOnline`);
    this.eventEmitter.emit(PRESENCE_EVENTS.STATUS_UPDATED, { userId, isOnline: false });
  }

  async isOnline(userId: number): Promise<boolean> {
    const status = await this.redisService.get(`user:${userId}:isOnline`);
    return status === '1';
  }

  async getBulkOnlineStatus(userIds: number[]): Promise<Map<number, boolean>> {
    if (userIds.length === 0) return new Map();

    const keys = userIds.map((id) => `user:${id}:isOnline`);
    const statuses = await this.redisService.mget(keys);

    return new Map(userIds.map((id, i) => [id, statuses[i] === '1']));
  }
}
