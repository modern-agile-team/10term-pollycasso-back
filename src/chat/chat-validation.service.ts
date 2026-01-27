import { Injectable } from '@nestjs/common';
import { FriendStatus } from '@prisma/client';
import { FriendService } from 'src/friend/friend.service';
import { BlockService } from 'src/block/block.service';
import { UsersService } from 'src/user/user.service';
import { wsError } from 'src/common/utils/ws-error.util';
import { CHAT_ERROR_CODES } from './constants/chat.constant';

export interface ValidatedDirectMessageUser {
  userId: number;
  nickname: string;
}

@Injectable()
export class ChatValidationService {
  constructor(
    private readonly friendService: FriendService,
    private readonly blockService: BlockService,
    private readonly userService: UsersService,
  ) {}

  async validateDirectMessage(
    senderId: number,
    targetId: number,
  ): Promise<ValidatedDirectMessageUser> {
    if (senderId === targetId) {
      throw wsError(400, CHAT_ERROR_CODES.CANNOT_WHISPER_SELF);
    }

    const targetUser = await this.userService.findOneById(targetId);
    if (!targetUser) {
      throw wsError(404, CHAT_ERROR_CODES.USER_NOT_FOUND);
    }

    const friendship = await this.friendService.getFriendship(senderId, targetId);
    if (!friendship || friendship.status !== FriendStatus.ACCEPTED) {
      throw wsError(403, CHAT_ERROR_CODES.NOT_FRIENDS);
    }

    const iBlockedTarget = await this.blockService.isBlocked(senderId, targetId);
    if (iBlockedTarget) {
      throw wsError(403, CHAT_ERROR_CODES.TARGET_IS_BLOCKED);
    }

    const targetBlockedMe = await this.blockService.isBlocked(targetId, senderId);
    if (targetBlockedMe) {
      throw wsError(403, CHAT_ERROR_CODES.YOU_ARE_BLOCKED);
    }

    return {
      userId: targetUser.id,
      nickname: targetUser.nickname,
    };
  }
}
