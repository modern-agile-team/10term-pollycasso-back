import { Injectable, NotFoundException, Inject, ConflictException } from '@nestjs/common';
import { Team, RoomMode, RoomStatus } from '@prisma/client';
import { WaitingStore, WaitingPlayerState } from './waiting.store';
import { PrismaService } from 'src/prisma/prisma.service';
import { WaitingStateResponseDto } from './dtos/responses/waiting-state-response.dto';
import { PlayerPageStatus } from './dtos/requests/update-status.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { Waiting } from './entities/waiting.entity';
import { Room } from 'src/room/entities/room.entity';
import type { IRoomReader } from 'src/room/interfaces/room-reader.interface';
import type { IRoomWriter } from 'src/room/interfaces/room-writer.interface';
import { ChatService } from 'src/chat/chat.service';
import {
  WAITING_CONSTANTS,
  WAITING_DOMAIN_ERRORS,
  WAITING_ERROR_CODES,
} from './constants/waiting.constant';

@Injectable()
export class WaitingService {
  constructor(
    private readonly waitingStore: WaitingStore,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    @Inject('IRoomReader') private readonly roomReader: IRoomReader,
    @Inject('IRoomWriter') private readonly roomWriter: IRoomWriter,
  ) {}

  private async loadWaitingEntity(roomId: number): Promise<Waiting> {
    const room = await this.findRoomOrThrow(roomId);
    const players = await this.waitingStore.getPlayers(roomId);
    const hostId = await this.waitingStore.getHostId(roomId);

    return Waiting.load(room, players, hostId);
  }

  private async findRoomOrThrow(roomId: number) {
    try {
      return await this.roomReader.getOneRoom(roomId);
    } catch {
      throw new NotFoundException({ code: WAITING_ERROR_CODES.ROOM_NOT_FOUND });
    }
  }

  async joinRoom(
    roomId: number,
    userId: number,
    password?: string,
  ): Promise<WaitingStateResponseDto> {
    const waiting = await this.loadWaitingEntity(roomId);

    waiting.canJoin(userId);

    if (waiting.hasPlayer(userId)) {
      return this.getState(roomId);
    }

    if (waiting.requiresPassword()) {
      await this.validatePassword(waiting.room, password);
    }

    const player = await this.createPlayer(userId, waiting);
    const isHost = waiting.isEmpty();

    await this.waitingStore.joinRoom(roomId, player, isHost);

    return this.getState(roomId);
  }

  private async validatePassword(room: Room, password?: string): Promise<void> {
    if (!password) {
      throw new NotFoundException({
        code: WAITING_ERROR_CODES.ROOM_PASSWORD_REQUIRED,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.ROOM_PASSWORD_REQUIRED]],
      });
    }

    const isValid = await PasswordEncoderUtil.compare(password, room.hashedPassword!);
    if (!isValid) {
      throw new NotFoundException({
        code: WAITING_ERROR_CODES.ROOM_INVALID_PASSWORD,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.ROOM_INVALID_PASSWORD]],
      });
    }
  }

  private async createPlayer(userId: number, waiting: Waiting): Promise<WaitingPlayerState> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const nickname = user?.nickname ?? 'Unknown';
    const level = user?.profile?.level ?? 1;
    const isHost = waiting.isEmpty();
    const initialTeam = waiting.getInitialTeam();

    return {
      userId,
      nickname,
      team: initialTeam,
      isReady: isHost,
      level,
      pageStatus: PlayerPageStatus.IDLE,
      outfit: undefined,
    };
  }

  async toggleReady(roomId: number, userId: number): Promise<boolean> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateToggleReady(userId);
    return await this.waitingStore.toggleReady(roomId, userId);
  }

  async changeTeam(roomId: number, userId: number, team: Team): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateTeamChange(userId, team);
    await this.waitingStore.changeTeam(roomId, userId, team);
  }

  async updatePageStatus(roomId: number, userId: number, status: PlayerPageStatus): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validatePlayerExists(userId);
    await this.waitingStore.updatePageStatus(roomId, userId, status);
  }

  async updateOutfit(
    roomId: number,
    userId: number,
    outfit: Record<string, unknown>,
  ): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validatePlayerExists(userId);
    await this.waitingStore.updateOutfit(roomId, userId, outfit);
  }

  async updateSettings(
    roomId: number,
    requesterId: number,
    settings: {
      name?: string;
      mode?: RoomMode;
      maxPlayers?: number;
      isPrivate?: boolean;
      password?: string;
    },
  ): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateSettingsUpdate(requesterId);

    if (settings.maxPlayers) {
      waiting.validateMaxPlayersUpdate(settings.maxPlayers);
    }

    if (settings.mode && waiting.shouldResetTeamsForMode(settings.mode)) {
      await this.resetTeamsForMode(roomId, settings.mode, waiting);
    }

    await this.roomWriter.updateRoomWhileWaiting(roomId, settings);
  }

  private async resetTeamsForMode(
    roomId: number,
    newMode: RoomMode,
    waiting: Waiting,
  ): Promise<void> {
    const players = waiting.players;
    await Promise.all(
      players.map(async (player, index) => {
        const newTeam =
          newMode === RoomMode.SOLO ? Team.NONE : index % 2 === 0 ? Team.RED : Team.BLUE;

        await this.waitingStore.changeTeam(roomId, player.userId, newTeam);

        if (player.userId !== waiting.hostId) {
          await this.waitingStore.setReady(roomId, player.userId, false);
        }
      }),
    );
  }

  async kickPlayer(roomId: number, requesterId: number, targetUserId: number): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateKick(requesterId, targetUserId);
    await this.waitingStore.leaveRoom(roomId, targetUserId);
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    await this.waitingStore.leaveRoom(roomId, userId);

    const players = await this.waitingStore.getPlayers(roomId);
    if (!players.length) {
      await this.waitingStore.clearRoom(roomId);
      await this.roomWriter.removeRoom(roomId);
    }
  }

  async startGame(roomId: number, requesterId: number): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateGameStart(requesterId);

    const wasMarked = await this.waitingStore.markGameStartedAtomic(
      roomId,
      WAITING_CONSTANTS.GAME_SESSION_TTL_SECONDS,
    );

    if (!wasMarked) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.GAME_ALREADY_STARTED,
      });
    }

    await this.roomWriter.startGame(roomId);
  }

  async markRoomAsStarted(roomId: number): Promise<void> {
    await this.waitingStore.setRoomExpiry(roomId, WAITING_CONSTANTS.GAME_SESSION_TTL_SECONDS);
  }

  async getState(roomId: number): Promise<WaitingStateResponseDto> {
    const room = await this.findRoomOrThrow(roomId);
    const players = await this.waitingStore.getPlayers(roomId);
    const hostId = await this.waitingStore.getHostId(roomId);

    return new WaitingStateResponseDto({
      status: room.status,
      hostId: hostId?.toString() ?? null,
      settings: {
        roomTitle: room.name,
        gameMode: room.mode,
        maxPlayers: room.maxPlayers,
        isPrivate: room.isPrivate,
      },
      players: players.map((p) => ({
        userId: p.userId,
        nickname: p.nickname,
        team: p.team,
        isReady: p.isReady,
        level: p.level,
        status: p.pageStatus,
        outfit: p.outfit,
      })),
    });
  }

  async getPlayers(roomId: number) {
    await this.findRoomOrThrow(roomId);
    return this.waitingStore.getPlayers(roomId);
  }

  async canStartMatch(roomId: number): Promise<boolean> {
    try {
      const waiting = await this.loadWaitingEntity(roomId);
      waiting.validateGameStart(waiting.hostId!);
      return true;
    } catch {
      return false;
    }
  }

  async handleGameStart(
    roomId: number,
    userId: number,
  ): Promise<{
    roomId: number;
    players: WaitingPlayerState[];
  }> {
    await this.startGame(roomId, userId);

    await this.markRoomAsStarted(roomId);

    const players = await this.getPlayers(roomId);

    return {
      roomId,
      players,
    };
  }

  async handleDisconnect(
    roomId: number,
    userId: number,
  ): Promise<{
    wasLastPlayer: boolean;
    remainingPlayers: WaitingPlayerState[];
    systemMessage: ReturnType<ChatService['createSystemMessage']> | null;
    isGameInProgress: boolean;
  }> {
    const room = await this.findRoomOrThrow(roomId);
    const isGameInProgress = room.status !== RoomStatus.WAITING;

    const players = await this.getPlayers(roomId);
    const wasLastPlayer = players.length === 1;
    const leavingPlayer = players.find((p) => p.userId === userId);

    if (!isGameInProgress) {
      await this.leaveRoom(roomId, userId);
    } else {
      if (wasLastPlayer) {
        await this.waitingStore.clearRoom(roomId);
      }
    }

    const remainingPlayers = wasLastPlayer || isGameInProgress ? [] : await this.getPlayers(roomId);

    const systemMessage =
      !wasLastPlayer && !isGameInProgress && leavingPlayer
        ? this.chatService.createSystemMessage({
            message: `${leavingPlayer.nickname}님이 퇴장했습니다.`,
          })
        : null;

    return {
      wasLastPlayer,
      remainingPlayers,
      systemMessage,
      isGameInProgress,
    };
  }

  async handleLeave(
    roomId: number,
    userId: number,
  ): Promise<{
    wasLastPlayer: boolean;
    remainingPlayers: WaitingPlayerState[];
    systemMessage: ReturnType<ChatService['createSystemMessage']> | null;
    isGameInProgress: boolean;
  }> {
    const room = await this.findRoomOrThrow(roomId);
    const isGameInProgress = room.status !== RoomStatus.WAITING;

    const players = await this.getPlayers(roomId);
    const wasLastPlayer = players.length === 1;
    const leavingPlayer = players.find((p) => p.userId === userId);

    await this.leaveRoom(roomId, userId);

    const remainingPlayers = wasLastPlayer ? [] : await this.getPlayers(roomId);

    const systemMessage =
      !wasLastPlayer && !isGameInProgress && leavingPlayer
        ? this.chatService.createSystemMessage({
            message: `${leavingPlayer.nickname}님이 퇴장했습니다.`,
          })
        : null;

    return {
      wasLastPlayer,
      remainingPlayers,
      systemMessage,
      isGameInProgress,
    };
  }

  async handleChatMessage(roomId: number, userId: number, messageText: string) {
    const players = await this.getPlayers(roomId);
    const player = players.find((p) => p.userId === userId);

    if (!player) {
      throw new NotFoundException({ code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND });
    }

    return this.chatService.createLobbyMessage({
      senderId: userId.toString(),
      nickname: player.nickname,
      message: messageText,
    });
  }
}
