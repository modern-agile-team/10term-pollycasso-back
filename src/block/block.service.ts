import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BLOCK_DOMAIN_ERRORS, BLOCK_ERROR_CODES } from './constants/block.constant';
import type { IFriendRepository } from 'src/friend/interfaces/friend-repository.interface';
import type { IBlockRepository } from './interfaces/block-repository.interface';
import { UsersService } from 'src/user/user.service';

@Injectable()
export class BlockService {
  constructor(
    @Inject('IFriendRepository')
    private readonly friendRepository: IFriendRepository,
    @Inject('IBlockRepository')
    private readonly blockRepository: IBlockRepository,
    private readonly userService: UsersService,
  ) {}

  async block(userId: number, targetUsername: string) {
    const targetUser = await this.userService.findUserByUsername(targetUsername);
    if (!targetUser) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.USER_NOT_FOUND });
    }

    if (userId === targetUser.id) {
      throw new BadRequestException({
        code: BLOCK_ERROR_CODES.CANNOT_SELF_BLOCK,
        errors: [BLOCK_DOMAIN_ERRORS[BLOCK_ERROR_CODES.CANNOT_SELF_BLOCK]],
      });
    }

    const alreadyBlocked = await this.blockRepository.find(userId, targetUser.id);
    if (alreadyBlocked) {
      return alreadyBlocked;
    }

    return await this.blockRepository.create(userId, targetUser.id);
  }

  async unblock(userId: number, targetUsername: string) {
    const targetUser = await this.userService.findUserByUsername(targetUsername);
    if (!targetUser) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.USER_NOT_FOUND });
    }

    const exists = await this.blockRepository.find(userId, targetUser.id);
    if (!exists) {
      throw new NotFoundException({ code: BLOCK_ERROR_CODES.BLOCK_NOT_FOUND });
    }

    await this.blockRepository.delete(userId, targetUser.id);
  }
}
