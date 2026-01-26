import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BLOCK_DOMAIN_ERRORS, BLOCK_ERROR_CODES } from './constants/block.constant';
import type { IBlockRepository } from './interfaces/block-repository.interface';
import { UsersService } from 'src/user/user.service';

@Injectable()
export class BlockService {
  constructor(
    @Inject('IBlockRepository')
    private readonly blockRepository: IBlockRepository,
    private readonly userService: UsersService,
  ) {}

  async block(userId: number, targetUserId: number) {
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

    const existing = await this.blockRepository.find(userId, targetUserId);
    if (existing) return existing;

    return await this.blockRepository.create(userId, targetUserId);
  }

  async unblock(userId: number, targetUserId: number) {
    const targetUser = await this.userService.findOneById(targetUserId);
    if (!targetUser) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.USER_NOT_FOUND });
    }

    const exists = await this.blockRepository.find(userId, targetUserId);
    if (!exists) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.BLOCK_NOT_FOUND });
    }

    await this.blockRepository.delete(userId, targetUserId);
  }
}
