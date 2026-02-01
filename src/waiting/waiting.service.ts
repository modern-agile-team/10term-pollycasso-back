import {
  Injectable,
  NotFoundException,
  Inject,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
import { GameStateStore } from 'src/game-state/game-state.store';
import { GamePhase } from 'src/game-state/interfaces/game-state.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GAME_EVENTS } from 'src/game/constants/game.constant';
import { ChatMessageDto, ChatReceiveChannel } from 'src/chat/dtos/responses/message-response.dto';
import { ChatValidationService } from 'src/chat/chat-validation.service';
import { PlayerResponseDto } from './dtos/responses/player-response.dto';
import { Outfit } from 'src/common/types/outfit.type';
import { OutfitVO } from 'src/common/value-objects/outfit.vo';
import { OutfitDto } from 'src/common/dtos/responses/outfit-response.dto';
import {
  WAITING_CONSTANTS,
  WAITING_DOMAIN_ERRORS,
  WAITING_ERROR_CODES,
} from './constants/waiting.constant';
import {
  NoPlayersToStartError,
  RoomAlreadyStartedError,
  RoomNotFoundError,
  WaitingRepository,
} from './waiting.repository';

type StartGameResult = {
  matchId: number;
  roomMemberIdByUserId: Record<number, number>;
};

@Injectable()
export class WaitingService {
  constructor(
    private readonly waitingStore: WaitingStore,
    private readonly prisma: PrismaService,
    private readonly chatService: ChatService,
    private readonly gameStateStore: GameStateStore,
    private readonly waitingRepository: WaitingRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly chatValidationService: ChatValidationService,
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
    const room = await this.roomReader.getOneRoom(roomId);
    if (!room) {
      throw new RoomNotFoundError(roomId);
    }
    return room;
  }

  async joinRoom(
    roomId: number,
    userId: number,
    password?: string,
  ): Promise<{
    state: WaitingStateResponseDto;
    systemMessage: ChatMessageDto;
  }> {
    const waiting = await this.loadWaitingEntity(roomId);

    waiting.canJoin(userId);

    if (waiting.hasPlayer(userId)) {
      const state = await this.getState(roomId);
      const systemMessage = this.chatService.createSystemMessage({
        message: `${waiting.players.find((p) => p.userId === userId)?.nickname}님이 입장했습니다.`,
      });
      return { state, systemMessage };
    }

    if (waiting.requiresPassword()) {
      await this.validatePassword(waiting.room, password);
    }

    const player = await this.createPlayer(userId, waiting);
    await this.waitingStore.joinRoom(roomId, player);
    const isHost = await this.waitingStore.tryAssignHost(roomId, userId);
    if (isHost) {
      await this.waitingStore.setReady(roomId, userId, true);
    }

    const state = await this.getState(roomId);
    const systemMessage = this.chatService.createSystemMessage({
      message: `${player.nickname}님이 입장했습니다.`,
    });

    return { state, systemMessage };
  }

  private async validatePassword(room: Room, password?: string): Promise<void> {
    if (!password) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.ROOM_PASSWORD_REQUIRED,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.ROOM_PASSWORD_REQUIRED]],
      });
    }

    const isValid = await PasswordEncoderUtil.compare(password, room.hashedPassword!);
    if (!isValid) {
      throw new ForbiddenException({ code: WAITING_ERROR_CODES.ROOM_INVALID_PASSWORD });
    }
  }

  private async createPlayer(userId: number, waiting: Waiting): Promise<WaitingPlayerState> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const nickname = user?.nickname ?? 'Unknown';
    const level = user?.profile?.level ?? 1;
    const initialTeam = waiting.getInitialTeam();
    const outfit = OutfitVO.from(user?.profile?.outfit);

    return {
      userId,
      nickname,
      team: initialTeam,
      isReady: false,
      level,
      pageStatus: PlayerPageStatus.IDLE,
      outfit: outfit.get(),
      joinedAt: Date.now(),
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

  async updateOutfit(roomId: number, userId: number, outfit: Outfit): Promise<void> {
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
  ): Promise<{
    players: PlayerResponseDto[];
    systemMessage: ChatMessageDto;
  }> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateSettingsUpdate(requesterId);

    if (settings.maxPlayers) {
      waiting.validateMaxPlayersUpdate(settings.maxPlayers);
    }

    if (settings.mode && waiting.shouldResetTeamsForMode(settings.mode)) {
      await this.resetTeamsForMode(roomId, settings.mode, waiting);
    }

    await this.roomWriter.updateRoomWhileWaiting(roomId, settings);

    const players = await this.getPlayerResponses(roomId);
    const systemMessage = this.chatService.createSystemMessage({
      message: '게임 설정이 변경되었습니다.',
    });

    return { players, systemMessage };
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

  async kickPlayer(
    roomId: number,
    requesterId: number,
    targetUserId: number,
  ): Promise<{
    players: PlayerResponseDto[];
    systemMessage: ChatMessageDto;
  }> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateKick(requesterId, targetUserId);

    const players = await this.waitingStore.getPlayers(roomId);
    const kickedPlayer = players.find((p) => p.userId === targetUserId);

    if (!kickedPlayer) {
      throw new NotFoundException({ code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND });
    }

    await this.waitingStore.leaveRoom(roomId, targetUserId);

    const playerResponses = await this.getPlayerResponses(roomId);
    const systemMessage = this.chatService.createSystemMessage({
      message: `${kickedPlayer.nickname}님이 강퇴되었습니다.`,
    });

    return { players: playerResponses, systemMessage };
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    await this.waitingStore.leaveRoom(roomId, userId);

    const players = await this.waitingStore.getPlayers(roomId);
    if (!players.length) {
      await this.waitingStore.clearRoom(roomId);
      await this.roomWriter.removeRoom(roomId);
    }
  }

  async startGame(roomId: number, requesterId: number): Promise<StartGameResult> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateGameStart(requesterId);

    let result: StartGameResult;

    try {
      result = await this.waitingRepository.startGameTx({
        roomId,
        hostUserId: requesterId,
        players: waiting.players,
      });
    } catch (error) {
      if (error instanceof RoomAlreadyStartedError) {
        throw new ConflictException({ code: WAITING_ERROR_CODES.GAME_ALREADY_STARTED });
      }
      if (error instanceof RoomNotFoundError) {
        throw new NotFoundException({ code: WAITING_ERROR_CODES.ROOM_NOT_FOUND });
      }
      if (error instanceof NoPlayersToStartError) {
        throw new ConflictException({ code: WAITING_ERROR_CODES.GAME_START_NOT_ENOUGH_PLAYERS });
      }
      throw new InternalServerErrorException({ code: WAITING_ERROR_CODES.GAME_START_FAILED });
    }

    await this.roomWriter.publishRoomUpdated(roomId);

    return result;
  }

  async markRoomAsStarted(roomId: number): Promise<void> {
    await this.waitingStore.setRoomExpiry(roomId, WAITING_CONSTANTS.GAME_SESSION_TTL_SECONDS);
  }

  async initializeGameState(
    roomId: number,
    matchId: number,
    roomMemberIdByUserId: Record<number, number>,
  ): Promise<{
    phase: GamePhase;
    endsAt: number;
    phaseContext: null;
  }> {
    const loadingEndTime = Date.now() + WAITING_CONSTANTS.LOADING_PHASE_DURATION_MS;

    await this.gameStateStore.set(roomId, {
      phase: GamePhase.LOADING,
      endsAt: loadingEndTime,
      currentRound: 1,
      totalRounds: WAITING_CONSTANTS.DEFAULT_ROUNDS,
      matchId,
      roomMemberIdByUserId,
      currentTheme: null,
      recentThemes: [],
      phaseContext: null,
    });

    this.eventEmitter.emit(GAME_EVENTS.LOADING_STARTED, { roomId });

    return {
      phase: GamePhase.LOADING,
      endsAt: loadingEndTime,
      phaseContext: null,
    };
  }

  async handleGameStart(
    roomId: number,
    requesterId: number,
  ): Promise<{
    gameState: {
      phase: GamePhase;
      endsAt: number;
      phaseContext: null;
    };
  }> {
    const { matchId, roomMemberIdByUserId } = await this.startGame(roomId, requesterId);
    await this.markRoomAsStarted(roomId);
    const gameState = await this.initializeGameState(roomId, matchId, roomMemberIdByUserId);

    return { gameState };
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
        outfit: new OutfitDto(p.outfit),
      })),
    });
  }

  async getPlayers(roomId: number) {
    await this.findRoomOrThrow(roomId);
    return this.waitingStore.getPlayers(roomId);
  }

  async getPlayerResponses(roomId: number): Promise<PlayerResponseDto[]> {
    const players = await this.getPlayers(roomId);
    return players.map(
      (p) =>
        new PlayerResponseDto({
          userId: p.userId,
          nickname: p.nickname,
          team: p.team,
          isReady: p.isReady,
          level: p.level,
          status: p.pageStatus,
          outfit: new OutfitDto(p.outfit),
        }),
    );
  }

  async getRoomSettings(roomId: number): Promise<{
    roomTitle: string;
    gameMode: RoomMode;
    maxPlayers: number;
    isPrivate: boolean;
  }> {
    const room = await this.findRoomOrThrow(roomId);
    return {
      roomTitle: room.name,
      gameMode: room.mode,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
    };
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

  async handleDisconnect(
    roomId: number,
    userId: number,
  ): Promise<{
    wasLastPlayer: boolean;
    players: PlayerResponseDto[];
    systemMessage: ChatMessageDto | null;
    isGameInProgress: boolean;
  }> {
    let room: Room | null = null;
    let isGameInProgress = false;

    try {
      room = await this.findRoomOrThrow(roomId);
      isGameInProgress = room.status !== RoomStatus.WAITING;
    } catch {
      return {
        wasLastPlayer: false,
        players: [],
        systemMessage: null,
        isGameInProgress: false,
      };
    }

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

    const playerResponses =
      wasLastPlayer || isGameInProgress ? [] : await this.getPlayerResponses(roomId);

    const systemMessage =
      !wasLastPlayer && !isGameInProgress && leavingPlayer
        ? this.chatService.createSystemMessage({
            message: `${leavingPlayer.nickname}님이 퇴장했습니다.`,
          })
        : null;

    return {
      wasLastPlayer,
      players: playerResponses,
      systemMessage,
      isGameInProgress,
    };
  }

  async handleLeave(
    roomId: number,
    userId: number,
  ): Promise<{
    wasLastPlayer: boolean;
    players: PlayerResponseDto[];
    systemMessage: ChatMessageDto | null;
    isGameInProgress: boolean;
  }> {
    const room = await this.findRoomOrThrow(roomId);
    const isGameInProgress = room.status !== RoomStatus.WAITING;

    const players = await this.getPlayers(roomId);
    const wasLastPlayer = players.length === 1;
    const leavingPlayer = players.find((p) => p.userId === userId);

    await this.leaveRoom(roomId, userId);

    const playerResponses = wasLastPlayer ? [] : await this.getPlayerResponses(roomId);

    const systemMessage =
      !wasLastPlayer && !isGameInProgress && leavingPlayer
        ? this.chatService.createSystemMessage({
            message: `${leavingPlayer.nickname}님이 퇴장했습니다.`,
          })
        : null;

    return {
      wasLastPlayer,
      players: playerResponses,
      systemMessage,
      isGameInProgress,
    };
  }

  async handleChatMessage(
    roomId: number,
    userId: number,
    messageText: string,
    channel?: string,
    targetId?: number,
  ): Promise<{
    message: ChatMessageDto;
    isDirectMessage: boolean;
    targetUserId?: number;
  }> {
    const players = await this.waitingStore.getPlayers(roomId);
    const sender = players.find((p) => p.userId === userId);

    if (!sender) {
      throw new NotFoundException({
        code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND,
      });
    }

    if (channel === ChatReceiveChannel.DIRECT && targetId) {
      const targetUserId = Number(targetId);

      await this.chatValidationService.validateDirectMessage(userId, targetUserId);

      const targetPlayer = players.find((p) => p.userId === targetUserId);
      if (!targetPlayer) {
        throw new NotFoundException({
          code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND,
        });
      }

      const message = this.chatService.createDirectMessage({
        senderId: userId.toString(),
        nickname: sender.nickname,
        message: messageText,
        targetId: targetUserId.toString(),
        targetNickname: targetPlayer.nickname,
      });

      return {
        message,
        isDirectMessage: true,
        targetUserId,
      };
    }

    const message = this.chatService.createGlobalMessage({
      senderId: userId.toString(),
      nickname: sender.nickname,
      message: messageText,
    });

    return {
      message,
      isDirectMessage: false,
    };
  }
}
