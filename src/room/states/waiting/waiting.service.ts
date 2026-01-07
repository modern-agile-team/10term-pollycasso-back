import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Team, RoomMode } from '@prisma/client';
import { WaitingState, WaitingPlayerState } from './waiting.state';
import { PrismaService } from 'src/prisma/prisma.service';
import { WaitingStateResponseDto } from './dtos/responses/waiting-state-response.dto';
import {
  WAITING_CONSTANTS,
  WAITING_DOMAIN_ERRORS,
  WAITING_ERROR_CODES,
} from './constants/waiting.constant';
import { PlayerPageStatus } from './dtos/requests/update-status.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { Waiting } from './entities/waiting.entity';
import { Room } from 'src/room/entities/room.entity';
import type { IRoomReader } from 'src/room/interfaces/room-reader.interface';
import type { IRoomWriter } from 'src/room/interfaces/room-writer.interface';

@Injectable()
export class WaitingService {
  constructor(
    private readonly waitingState: WaitingState,
    private readonly prisma: PrismaService,
    @Inject('IRoomReader') private readonly roomReader: IRoomReader,
    @Inject('IRoomWriter') private readonly roomWriter: IRoomWriter,
  ) {}

  private async loadWaitingEntity(roomId: number): Promise<Waiting> {
    const room = await this.findRoomOrThrow(roomId);
    const players = await this.waitingState.getPlayers(roomId);
    const hostId = await this.waitingState.getHostId(roomId);

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

    await this.waitingState.joinRoom(roomId, player, isHost);

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
    return await this.waitingState.toggleReady(roomId, userId);
  }

  async changeTeam(roomId: number, userId: number, team: Team): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateTeamChange(userId, team);
    await this.waitingState.changeTeam(roomId, userId, team);
  }

  async updatePageStatus(roomId: number, userId: number, status: PlayerPageStatus): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validatePlayerExists(userId);
    await this.waitingState.updatePageStatus(roomId, userId, status);
  }

  async updateOutfit(
    roomId: number,
    userId: number,
    outfit: Record<string, unknown>,
  ): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validatePlayerExists(userId);
    await this.waitingState.updateOutfit(roomId, userId, outfit);
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

        await this.waitingState.changeTeam(roomId, player.userId, newTeam);

        if (player.userId !== waiting.hostId) {
          await this.waitingState.setReady(roomId, player.userId, false);
        }
      }),
    );
  }

  async kickPlayer(roomId: number, requesterId: number, targetUserId: number): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateKick(requesterId, targetUserId);
    await this.waitingState.leaveRoom(roomId, targetUserId);
  }

  async leaveRoom(roomId: number, userId: number): Promise<void> {
    await this.waitingState.leaveRoom(roomId, userId);

    const players = await this.waitingState.getPlayers(roomId);
    if (!players.length) {
      await this.waitingState.clearRoom(roomId);
      await this.roomWriter.removeRoom(roomId);
    }
  }

  async startGame(roomId: number, requesterId: number): Promise<void> {
    const waiting = await this.loadWaitingEntity(roomId);
    waiting.validateGameStart(requesterId);
    await this.roomWriter.startGame(roomId);
  }

  async markRoomAsStarted(roomId: number): Promise<void> {
    await this.waitingState.setRoomExpiry(roomId, WAITING_CONSTANTS.GAME_SESSION_TTL_SECONDS);
  }

  async getState(roomId: number): Promise<WaitingStateResponseDto> {
    const room = await this.findRoomOrThrow(roomId);
    const players = await this.waitingState.getPlayers(roomId);
    const hostId = await this.waitingState.getHostId(roomId);

    return new WaitingStateResponseDto({
      status: room.status,
      hostId: hostId?.toString() ?? null,
      endsAt: null,
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
        pageStatus: p.pageStatus,
        outfit: p.outfit,
      })),
      currentRound: null,
      totalRounds: null,
      phaseContext: null,
      teamScore: room.mode === RoomMode.TEAM ? { RED: 0, BLUE: 0 } : null,
    });
  }

  async getPlayers(roomId: number) {
    await this.findRoomOrThrow(roomId);
    return this.waitingState.getPlayers(roomId);
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
}
