import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BLOCK_DOMAIN_ERRORS, BLOCK_ERROR_CODES } from './constants/block.constant';
import type { IBlockRepository } from './interfaces/block-repository.interface';
import { UsersService } from 'src/user/user.service';
import { Block } from './block.entity';

@Injectable()
export class BlockService {
  constructor(
    @Inject('IBlockRepository')
    private readonly blockRepository: IBlockRepository,
    private readonly userService: UsersService,
  ) {}

  async isBlocked(userId: number, targetUserId: number): Promise<boolean> {
    const relation = await this.blockRepository.findBlockRelation(userId, targetUserId);
    return !!relation;
  }

  async getBlockedUsers(userId: number): Promise<{ blockedId: number }[]> {
    return this.blockRepository.findBlockedUsersByBlocker(userId);
  }

  async getBlockers(userId: number): Promise<{ blockerId: number }[]> {
    return this.blockRepository.findBlockersByBlocked(userId);
  }

  async getBlockedUsersByUserIds(
    userIds: number[],
  ): Promise<{ blockerId: number; blockedId: number }[]> {
    return this.blockRepository.findBlockedUsersByBlockerIds(userIds);
  }

  async block(userId: number, targetUserId: number): Promise<Block> {
    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.USER_NOT_FOUND });
    }

    if (userId === targetUserId) {
      throw new BadRequestException({
        code: BLOCK_ERROR_CODES.CANNOT_SELF_BLOCK,
        errors: [BLOCK_DOMAIN_ERRORS[BLOCK_ERROR_CODES.CANNOT_SELF_BLOCK]],
      });
    }

    const existing = await this.blockRepository.findBlockRelation(userId, targetUserId);
    if (existing) return existing;

    return await this.blockRepository.createBlockRelation(userId, targetUserId);
  }

  async unblock(userId: number, targetUserId: number): Promise<void> {
    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.USER_NOT_FOUND });
    }

    const exists = await this.blockRepository.findBlockRelation(userId, targetUserId);
    if (!exists) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.BLOCK_NOT_FOUND });
    }

    await this.blockRepository.deleteBlockRelation(userId, targetUserId);
  }
}
