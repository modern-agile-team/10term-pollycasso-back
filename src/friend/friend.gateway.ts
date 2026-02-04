import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { SocketExceptionFilter } from 'src/common/filters/socket-exception.filter';
import { wsError } from 'src/common/utils/ws-error.util';
import { FRIEND_ERROR_CODES, FRIEND_EVENTS } from './constants/friend.constant';
import { FriendRelation } from './dtos/responses/friend.response.dto';
import { FriendStatusUpdateResponseDto } from './dtos/responses/friend-status-update.response.dto';
import { PresenceService } from 'src/presence/presence.service';
import { FriendService } from './friend.service';
import { TargetUserRequestDto } from './dtos/requests/target-user.request.dto';
import { SearchFriendRequestDto } from './dtos/requests/search-friend-request.dto';
import { AcceptFriendRequestDto } from './dtos/requests/accept-friend.request.dto';
import { BlockService } from 'src/block/block.service';
import { UsersService } from 'src/user/user.service';
import { FriendStatus } from '@prisma/client';
import { OnEvent } from '@nestjs/event-emitter';
import { PRESENCE_EVENTS } from 'src/presence/constants/presence.constant';

interface JwtPayload {
  sub: string;
  nickname: string;
  tag: string;
}

interface ClientData {
  userId: number;
  nickname: string;
}

interface FriendSocket extends Socket {
  data: ClientData;
}

@UseFilters(SocketExceptionFilter)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => {
      throw wsError(
        400,
        FRIEND_ERROR_CODES.INVALID_INPUT,
        errors.map((e) => ({
          field: e.property,
          reason: Object.values(e.constraints ?? {}),
        })),
      );
    },
  }),
)
@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || [],
    credentials: true,
  },
  namespace: '/friends',
})
export class FriendGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly friendService: FriendService,
    private readonly presenceService: PresenceService,
    private readonly blockService: BlockService,
    private readonly usersService: UsersService,
  ) {}

  private getClientData(client: FriendSocket): ClientData {
    if (
      !client.data ||
      typeof client.data.userId !== 'number' ||
      typeof client.data.nickname !== 'string'
    ) {
      throw wsError(400, FRIEND_ERROR_CODES.INVALID_ACCESS_TOKEN);
    }
    return client.data;
  }

  async handleConnection(client: FriendSocket): Promise<void> {
    const token =
      (typeof client.handshake.auth.token === 'string' ? client.handshake.auth.token : null) ||
      (typeof client.handshake.headers.authorization === 'string'
        ? client.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      client.emit(
        FRIEND_EVENTS.SYSTEM_NOTIFICATION,
        wsError(401, FRIEND_ERROR_CODES.ACCESS_TOKEN_MISSING).getError(),
      );
      void client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      client.data = { userId: Number(payload.sub), nickname: payload.nickname };

      await client.join(`user:${client.data.userId}:friends`);
    } catch (err: unknown) {
      const isTokenExpired = err instanceof Error && err.name === 'TokenExpiredError';
      const code = isTokenExpired
        ? FRIEND_ERROR_CODES.EXPIRED_ACCESS_TOKEN
        : FRIEND_ERROR_CODES.INVALID_ACCESS_TOKEN;

      client.emit(FRIEND_EVENTS.SYSTEM_NOTIFICATION, wsError(401, code).getError());
      void client.disconnect();
    }
  }

  async handleDisconnect() {}

  @SubscribeMessage(FRIEND_EVENTS.GET_LIST)
  async getFriendList(@ConnectedSocket() client: FriendSocket): Promise<void> {
    const clientData = this.getClientData(client);
    const friends = await this.friendService.getFriendList(clientData.userId);
    client.emit(FRIEND_EVENTS.GET_LIST, friends);
  }

  @SubscribeMessage(FRIEND_EVENTS.GET_RECOMMENDED_LIST)
  async getRecommendedFriends(@ConnectedSocket() client: FriendSocket): Promise<void> {
    const clientData = this.getClientData(client);
    const recommendedFriends = await this.friendService.getRecommendedFriends(clientData.userId);
    client.emit(FRIEND_EVENTS.GET_RECOMMENDED_LIST, recommendedFriends);
  }

  @SubscribeMessage(FRIEND_EVENTS.SEARCH)
  async searchFriends(
    @MessageBody() body: SearchFriendRequestDto,
    @ConnectedSocket() client: FriendSocket,
  ): Promise<void> {
    const clientData = this.getClientData(client);
    const results = await this.friendService.searchFriends(clientData.userId, body.keyword);
    client.emit(FRIEND_EVENTS.SEARCH, results);
  }

  @SubscribeMessage(FRIEND_EVENTS.SEARCH_WITHIN_RELATION)
  async searchFriendsWithRelation(
    @MessageBody() body: SearchFriendRequestDto,
    @ConnectedSocket() client: FriendSocket,
  ): Promise<void> {
    const clientData = this.getClientData(client);
    const results = await this.friendService.searchFriendsWithRelation(
      clientData.userId,
      body.keyword,
    );
    client.emit(FRIEND_EVENTS.SEARCH_WITHIN_RELATION, results);
  }

  @SubscribeMessage(FRIEND_EVENTS.REQUEST_SEND)
  async sendFriendRequest(
    @MessageBody() body: TargetUserRequestDto,
    @ConnectedSocket() client: FriendSocket,
  ): Promise<void> {
    const clientData = this.getClientData(client);
    const targetUser = await this.usersService.findOneById(body.targetUserId);
    if (!targetUser) throw wsError(404, FRIEND_ERROR_CODES.USER_NOT_FOUND);

    const result = await this.friendService.sendRequest(clientData.userId, body.targetUserId);
    client.emit(FRIEND_EVENTS.REQUEST_SEND, result);

    const targetIsOnline = await this.presenceService.isOnline(body.targetUserId);
    if (targetIsOnline) {
      const userIsOnline = await this.presenceService.isOnline(clientData.userId);
      void this.friendStatusUpdated(
        clientData.userId,
        [body.targetUserId],
        FriendRelation.REQUEST_RECEIVED,
        userIsOnline,
      );
    }
  }

  @SubscribeMessage(FRIEND_EVENTS.REQUEST_ACCEPT)
  async acceptFriendRequest(
    @MessageBody() body: AcceptFriendRequestDto,
    @ConnectedSocket() client: FriendSocket,
  ): Promise<void> {
    const clientData = this.getClientData(client);
    await this.friendService.respondFriendRequest(clientData.userId, body.requesterId, true);
    client.emit(FRIEND_EVENTS.REQUEST_ACCEPT);

    const [userOnline, requesterOnline] = await Promise.all([
      this.presenceService.isOnline(clientData.userId),
      this.presenceService.isOnline(body.requesterId),
    ]);

    if (requesterOnline) {
      void this.friendStatusUpdated(
        clientData.userId,
        [body.requesterId],
        FriendRelation.FRIEND,
        userOnline,
      );
    }

    if (userOnline) {
      void this.friendStatusUpdated(
        body.requesterId,
        [clientData.userId],
        FriendRelation.FRIEND,
        requesterOnline,
      );
    }
  }

  @SubscribeMessage(FRIEND_EVENTS.BLOCK)
  async blockFriend(
    @MessageBody() body: TargetUserRequestDto,
    @ConnectedSocket() client: FriendSocket,
  ): Promise<void> {
    const clientData = this.getClientData(client);
    await this.blockService.block(clientData.userId, body.targetUserId);
    client.emit(FRIEND_EVENTS.BLOCK, { success: true });

    const targetIsOnline = await this.presenceService.isOnline(body.targetUserId);
    if (targetIsOnline) {
      const userIsOnline = await this.presenceService.isOnline(clientData.userId);
      void this.friendStatusUpdated(
        clientData.userId,
        [body.targetUserId],
        FriendRelation.BLOCKED,
        userIsOnline,
      );
    }
  }

  @SubscribeMessage(FRIEND_EVENTS.DELETE)
  async deleteFriend(
    @MessageBody() body: TargetUserRequestDto,
    @ConnectedSocket() client: FriendSocket,
  ): Promise<void> {
    const clientData = this.getClientData(client);
    const targetId = body.targetUserId;
    const friendship = await this.friendService.getFriendship(clientData.userId, targetId);

    if (friendship?.status === FriendStatus.ACCEPTED) {
      await this.friendService.removeFriend(clientData.userId, targetId);
    } else if (friendship?.status === FriendStatus.PENDING) {
      if (friendship.requesterId === clientData.userId) {
        await this.friendService.cancelRequest(clientData.userId, targetId);
      } else {
        await this.friendService.respondFriendRequest(
          clientData.userId,
          friendship.requesterId,
          false,
        );
      }
    } else if (await this.blockService.isBlocked(clientData.userId, targetId)) {
      await this.blockService.unblock(clientData.userId, targetId);
    } else {
      throw wsError(404, FRIEND_ERROR_CODES.REQUEST_NOT_FOUND);
    }

    client.emit(FRIEND_EVENTS.DELETE, { success: true });

    const [targetOnline, userOnline] = await Promise.all([
      this.presenceService.isOnline(targetId),
      this.presenceService.isOnline(clientData.userId),
    ]);

    if (targetOnline) {
      void this.friendStatusUpdated(clientData.userId, [targetId], null, userOnline);
    }
  }

  @OnEvent(PRESENCE_EVENTS.STATUS_UPDATED)
  async handlePresenceStatusUpdated(payload: { userId: number; isOnline: boolean }) {
    const { userId, isOnline } = payload;

    const relatedUsers = await this.friendService.getFriendList(userId);
    const blockers = await this.blockService.getBlockers(userId);
    const blockedBySet = new Set(blockers.map((b) => b.blockerId));

    const filteredUsers = relatedUsers.filter(
      (user) => user.relation !== FriendRelation.BLOCKED && !blockedBySet.has(user.userId),
    );

    filteredUsers.forEach((user) => {
      const statusPayload = new FriendStatusUpdateResponseDto(userId, user.relation, isOnline);

      void this.server
        .to(`user:${user.userId}:friends`)
        .emit(FRIEND_EVENTS.STATUS_UPDATED, statusPayload);
    });
  }

  private friendStatusUpdated(
    userId: number,
    friendIds: number[],
    relation: FriendRelation | null,
    isOnline: boolean,
  ): void {
    const payload = new FriendStatusUpdateResponseDto(userId, relation, isOnline);

    friendIds.forEach((friendId) => {
      void this.server.to(`user:${friendId}:friends`).emit(FRIEND_EVENTS.STATUS_UPDATED, payload);
    });
  }
}
