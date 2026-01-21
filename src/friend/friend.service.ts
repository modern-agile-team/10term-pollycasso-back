import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FriendStatus } from '@prisma/client';
import { FRIEND_DOMAIN_ERRORS, FRIEND_ERROR_CODES } from './constants/friend.constant';
import type { IFriendRepository } from './interfaces/friend-repository.interface';
import { UsersService } from 'src/user/user.service';

@Injectable()
export class FriendService {
  constructor(
    @Inject('IFriendRepository')
    private readonly friendRepository: IFriendRepository,
    private readonly userService: UsersService,
  ) {}

  async sendRequest(userId: number, targetUsername: string) {
    const targetUser = await this.userService.findUserByUsername(targetUsername);
    if (!targetUser) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    if (userId === targetUser.id) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.CANNOT_ADD_SELF,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.CANNOT_ADD_SELF]],
      });
    }

    const existing = await this.friendRepository.findFriendship(userId, targetUser.id);
    if (existing) return existing;

    return await this.friendRepository.create(userId, targetUser.id);
  }

  async cancelRequest(userId: number, targetUsername: string) {
    const targetUser = await this.userService.findUserByUsername(targetUsername);
    if (!targetUser) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    const request = await this.friendRepository.findFriendship(userId, targetUser.id);
    if (!request) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });
    }

    if (request.status !== FriendStatus.PENDING) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS]],
      });
    }

    await this.friendRepository.deleteById(request.id);
  }

  async respond(userId: number, requesterUsername: string, accept: boolean) {
    const requester = await this.userService.findUserByUsername(requesterUsername);
    if (!requester) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    const request = await this.friendRepository.findFriendship(requester.id, userId);
    if (!request) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.REQUEST_NOT_FOUND });
    }

    if (request.status !== FriendStatus.PENDING) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.INVALID_REQUEST_STATUS]],
      });
    }

    if (!accept) {
      await this.friendRepository.deleteById(request.id);
      return;
    }

    return await this.friendRepository.updateStatus(request.id, FriendStatus.ACCEPTED);
  }

  async remove(userId: number, friendUsername: string) {
    const friend = await this.userService.findUserByUsername(friendUsername);
    if (!friend) {
      throw new NotFoundException({ code: FRIEND_ERROR_CODES.USER_NOT_FOUND });
    }

    const friendship = await this.friendRepository.findFriendship(userId, friend.id);
    if (!friendship || friendship.status !== FriendStatus.ACCEPTED) {
      throw new BadRequestException({
        code: FRIEND_ERROR_CODES.NOT_FRIENDS,
        errors: [FRIEND_DOMAIN_ERRORS[FRIEND_ERROR_CODES.NOT_FRIENDS]],
      });
    }

    await this.friendRepository.deleteBidirectional(userId, friend.id);
  }
}
