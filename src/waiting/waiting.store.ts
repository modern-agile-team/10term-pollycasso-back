import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { Team } from '@prisma/client';
import Redis from 'ioredis';
import { PlayerPageStatus } from './dtos/requests/update-status.dto';
import { Outfit } from 'src/common/types/outfit.type';
import { OutfitVO } from 'src/common/value-objects/outfit.vo';

export interface WaitingPlayerState {
  userId: number;
  nickname: string;
  team: Team;
  isReady: boolean;
  level: number;
  pageStatus: PlayerPageStatus;
  outfit: Outfit;
  joinedAt: number;
}

@Injectable()
export class WaitingStore {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private getMembersKey(roomId: number) {
    return `waiting:room:${roomId}:members`;
  }

  private getPlayerKey(roomId: number, userId: number) {
    return `waiting:room:${roomId}:player:${userId}`;
  }

  private getHostKey(roomId: number) {
    return `waiting:room:${roomId}:host`;
  }

  private getRoomStatusKey(roomId: number) {
    return `waiting:room:${roomId}:status`;
  }

  private getUserRoomKey(userId: number) {
    return `waiting:user:${userId}:currentRoom`;
  }

  async joinRoom(roomId: number, player: WaitingPlayerState) {
    const pipeline = this.redis.pipeline();
    const outfit = player.outfit;

    pipeline.set(this.getUserRoomKey(player.userId), roomId.toString());
    pipeline.sadd(this.getMembersKey(roomId), player.userId.toString());
    pipeline.hset(this.getPlayerKey(roomId, player.userId), {
      userId: player.userId.toString(),
      nickname: player.nickname,
      team: player.team,
      isReady: player.isReady ? '1' : '0',
      level: player.level.toString(),
      pageStatus: player.pageStatus,
      outfit: JSON.stringify(outfit),
      joinedAt: player.joinedAt.toString(),
    });

    await pipeline.exec();
  }

  async leaveRoom(roomId: number, userId: number) {
    const hostId = await this.redis.get(this.getHostKey(roomId));
    const isHost = hostId === userId.toString();

    const pipeline = this.redis.pipeline();
    pipeline.del(this.getUserRoomKey(userId));
    pipeline.srem(this.getMembersKey(roomId), userId.toString());
    pipeline.del(this.getPlayerKey(roomId, userId));
    await pipeline.exec();

    if (isHost) {
      await this.autoTransferHost(roomId);
    }
  }

  async getPlayer(roomId: number, userId: number): Promise<WaitingPlayerState | null> {
    const data = await this.redis.hgetall(this.getPlayerKey(roomId, userId));
    if (!data.userId) return null;

    return {
      userId: Number(data.userId),
      nickname: data.nickname,
      team: data.team as Team,
      isReady: data.isReady === '1',
      level: Number(data.level) || 1,
      pageStatus: (data.pageStatus as PlayerPageStatus) || PlayerPageStatus.IDLE,
      outfit: OutfitVO.fromJSON(data.outfit).get(),
      joinedAt: Number(data.joinedAt),
    };
  }

  async getPlayers(roomId: number): Promise<WaitingPlayerState[]> {
    const memberIds = await this.redis.smembers(this.getMembersKey(roomId));
    if (memberIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    memberIds.forEach((id) => pipeline.hgetall(this.getPlayerKey(roomId, Number(id))));

    const results = await pipeline.exec();
    if (!results) return [];

    return results
      .map(([, data]) => data)
      .filter((d): d is Record<string, string> => {
        return typeof d === 'object' && d !== null && 'userId' in d;
      })
      .map((d) => ({
        userId: Number(d.userId),
        nickname: d.nickname,
        team: d.team as Team,
        isReady: d.isReady === '1',
        level: Number(d.level) || 1,
        pageStatus: (d.pageStatus as PlayerPageStatus) || PlayerPageStatus.IDLE,
        outfit: OutfitVO.fromJSON(d.outfit).get(),
        joinedAt: Number(d.joinedAt),
      }));
  }

  async toggleReady(roomId: number, userId: number): Promise<boolean> {
    const key = this.getPlayerKey(roomId, userId);
    const current = await this.redis.hget(key, 'isReady');
    const next = current === '1' ? '0' : '1';
    await this.redis.hset(key, 'isReady', next);
    return next === '1';
  }

  async setReady(roomId: number, userId: number, isReady: boolean): Promise<void> {
    const key = this.getPlayerKey(roomId, userId);
    await this.redis.hset(key, 'isReady', isReady ? '1' : '0');
  }

  async changeTeam(roomId: number, userId: number, team: Team) {
    await this.redis.hset(this.getPlayerKey(roomId, userId), 'team', team);
  }

  async updatePageStatus(roomId: number, userId: number, status: PlayerPageStatus) {
    await this.redis.hset(this.getPlayerKey(roomId, userId), 'pageStatus', status);
  }

  async updateOutfit(roomId: number, userId: number, outfit: Outfit) {
    await this.redis.hset(this.getPlayerKey(roomId, userId), 'outfit', JSON.stringify(outfit));
  }

  async getHostId(roomId: number): Promise<number | null> {
    const hostId = await this.redis.get(this.getHostKey(roomId));
    return hostId ? Number(hostId) : null;
  }

  async setRoomExpiry(roomId: number, seconds: number): Promise<void> {
    await this.redis.set(this.getRoomStatusKey(roomId), 'STARTED', 'EX', seconds);
  }

  async isRoomStarted(roomId: number): Promise<boolean> {
    const status = await this.redis.get(this.getRoomStatusKey(roomId));
    return status === 'STARTED';
  }

  async markGameStartedAtomic(roomId: number, ttlSeconds: number): Promise<boolean> {
    const key = this.getRoomStartedKey(roomId);
    const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  }

  private getRoomStartedKey(roomId: number): string {
    return `waiting:room:${roomId}:started`;
  }

  async getCurrentRoom(userId: number): Promise<number | null> {
    const roomId = await this.redis.get(this.getUserRoomKey(userId));
    return roomId ? Number(roomId) : null;
  }

  async clearRoom(roomId: number) {
    const memberIds = await this.redis.smembers(this.getMembersKey(roomId));
    if (memberIds.length === 0) return;

    const pipeline = this.redis.pipeline();
    memberIds.forEach((id) => {
      pipeline.del(this.getPlayerKey(roomId, Number(id)));
      pipeline.del(this.getUserRoomKey(Number(id)));
    });
    pipeline.del(this.getMembersKey(roomId));
    pipeline.del(this.getHostKey(roomId));
    pipeline.del(this.getRoomStatusKey(roomId));
    await pipeline.exec();
  }

  async tryAssignHost(roomId: number, userId: number): Promise<boolean> {
    const result = await this.redis.set(this.getHostKey(roomId), userId.toString(), 'NX');
    return result === 'OK';
  }

  private async autoTransferHost(roomId: number) {
    const players = await this.getPlayers(roomId);

    if (players.length === 0) {
      await this.clearRoom(roomId);
      return;
    }

    const nextHost = players.sort((a, b) => a.joinedAt - b.joinedAt)[0];

    const pipeline = this.redis.pipeline();
    pipeline.set(this.getHostKey(roomId), nextHost.userId.toString());
    pipeline.hset(this.getPlayerKey(roomId, nextHost.userId), 'isReady', '1');
    await pipeline.exec();
  }

  async getNickname(roomId: number, userId: number): Promise<string | null> {
    const key = this.getPlayerKey(roomId, userId);
    const nickname = await this.redis.hget(key, 'nickname');
    return nickname ?? null;
  }
}
