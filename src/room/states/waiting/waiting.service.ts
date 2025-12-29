import {
  Injectable,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Team, RoomMode, RoomStatus } from '@prisma/client';
import { WaitingState, WaitingPlayerState } from './waiting.state';
import { PrismaService } from 'src/prisma/prisma.service';
import { WaitingStateResponseDto } from './dtos/responses/waiting-state-response.dto';
import { WAITING_ERROR_CODES, WAITING_DOMAIN_ERRORS } from './constants/waiting.constant';
import { PlayerPageStatus } from './dtos/requests/update-status.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import type { IRoomReader } from 'src/room/interfaces/room-reader.interface';
import type { IRoomWriter } from 'src/room/interfaces/room-writer.interface';
import { ROOM_CONSTANTS } from 'src/room/constants/room.constant';

@Injectable()
export class WaitingService {
  constructor(
    private readonly waitingState: WaitingState,
    private readonly prisma: PrismaService,
    @Inject('IRoomReader') private readonly roomReader: IRoomReader,
    @Inject('IRoomWriter') private readonly roomWriter: IRoomWriter,
  ) {}

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
    const room = await this.findRoomOrThrow(roomId);

    if (room.status !== RoomStatus.WAITING) {
      throw new ConflictException({ code: WAITING_ERROR_CODES.GAME_ALREADY_STARTED });
    }

    const currentPlayers = await this.waitingState.getPlayers(roomId);
    if (currentPlayers.find((p) => p.userId === userId)) {
      return this.getState(roomId);
    }

    if (currentPlayers.length >= room.maxPlayers) {
      throw new ConflictException({ code: WAITING_ERROR_CODES.ROOM_FULL });
    }

    if (room.isPrivate && room.hashedPassword) {
      if (!password) {
        throw new BadRequestException({
          code: WAITING_ERROR_CODES.ROOM_PASSWORD_REQUIRED,
          errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.ROOM_PASSWORD_REQUIRED]],
        });
      }
      const isValid = await PasswordEncoderUtil.compare(password, room.hashedPassword);
      if (!isValid) {
        throw new BadRequestException({
          code: WAITING_ERROR_CODES.ROOM_INVALID_PASSWORD,
          errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.ROOM_INVALID_PASSWORD]],
        });
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const nickname = user?.nickname ?? 'Unknown';
    const level = user?.profile?.level ?? 1;
    const isHost = currentPlayers.length === 0;
    const initialTeam = this.getInitialTeam(room.mode, currentPlayers);

    const player: WaitingPlayerState = {
      userId,
      nickname,
      team: initialTeam,
      isReady: isHost,
      level,
      pageStatus: PlayerPageStatus.IDLE,
      outfit: undefined,
    };

    await this.waitingState.joinRoom(roomId, player, isHost);

    return this.getState(roomId);
  }

  async toggleReady(roomId: number, userId: number): Promise<boolean> {
    const player = await this.waitingState.getPlayer(roomId, userId);
    if (!player) throw new NotFoundException({ code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND });

    const hostId = await this.waitingState.getHostId(roomId);
    if (hostId === userId)
      throw new ForbiddenException({ code: WAITING_ERROR_CODES.HOST_CANNOT_TOGGLE_READY });

    return this.waitingState.toggleReady(roomId, userId);
  }

  async changeTeam(roomId: number, userId: number, team: Team): Promise<void> {
    const room = await this.findRoomOrThrow(roomId);

    if (room.mode === RoomMode.SOLO) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.SOLO_MODE_NO_TEAMS,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.SOLO_MODE_NO_TEAMS]],
      });
    }
    if (team === Team.NONE) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.INVALID_TEAM,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.INVALID_TEAM]],
      });
    }

    const players = await this.waitingState.getPlayers(roomId);
    const player = players.find((p) => p.userId === userId);
    if (!player) throw new NotFoundException({ code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND });

    const maxPerTeam = Math.ceil(room.maxPlayers / 2);
    const targetTeamCount = players.filter((p) => p.team === team && p.userId !== userId).length;
    if (targetTeamCount >= maxPerTeam)
      throw new ConflictException({ code: WAITING_ERROR_CODES.TEAM_FULL });

    await this.waitingState.changeTeam(roomId, userId, team);
  }

  async updatePageStatus(roomId: number, userId: number, status: PlayerPageStatus): Promise<void> {
    const player = await this.waitingState.getPlayer(roomId, userId);
    if (!player) throw new NotFoundException({ code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND });
    await this.waitingState.updatePageStatus(roomId, userId, status);
  }

  async updateOutfit(
    roomId: number,
    userId: number,
    outfit: Record<string, unknown>,
  ): Promise<void> {
    const player = await this.waitingState.getPlayer(roomId, userId);
    if (!player) throw new NotFoundException({ code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND });
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
    const hostId = await this.waitingState.getHostId(roomId);
    if (hostId !== requesterId)
      throw new ForbiddenException({ code: WAITING_ERROR_CODES.PERMISSION_DENIED });

    if (settings.maxPlayers) {
      const currentPlayers = await this.waitingState.getPlayers(roomId);
      if (settings.maxPlayers < currentPlayers.length) {
        throw new BadRequestException({
          code: WAITING_ERROR_CODES.MAX_PLAYERS_LESS_THAN_CURRENT,
          errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.MAX_PLAYERS_LESS_THAN_CURRENT]],
        });
      }
    }

    if (settings.mode) {
      const room = await this.findRoomOrThrow(roomId);
      if (room.mode !== settings.mode) await this.resetForModeChange(roomId, settings.mode);
    }

    await this.roomWriter.updateRoomByWaiting(roomId, settings);
  }

  async kickPlayer(roomId: number, requesterId: number, targetUserId: number): Promise<void> {
    const hostId = await this.waitingState.getHostId(roomId);
    if (hostId !== requesterId)
      throw new ForbiddenException({ code: WAITING_ERROR_CODES.PERMISSION_DENIED });
    if (requesterId === targetUserId) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.CANNOT_KICK_SELF,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.CANNOT_KICK_SELF]],
      });
    }

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
    const hostId = await this.waitingState.getHostId(roomId);
    if (hostId !== requesterId)
      throw new ForbiddenException({ code: WAITING_ERROR_CODES.GAME_START_NOT_HOST });

    const room = await this.findRoomOrThrow(roomId);
    if (room.status !== RoomStatus.WAITING)
      throw new ConflictException({ code: WAITING_ERROR_CODES.GAME_ALREADY_STARTED });

    const players = await this.waitingState.getPlayers(roomId);

    if (room.mode === RoomMode.SOLO) {
      if (players.length < ROOM_CONSTANTS.SOLO_MIN_PLAYERS)
        throw new ConflictException({ code: WAITING_ERROR_CODES.GAME_START_NOT_ENOUGH_PLAYERS });
    } else if (!ROOM_CONSTANTS.TEAM_ALLOWED_PLAYERS.includes(players.length)) {
      throw new ConflictException({ code: WAITING_ERROR_CODES.GAME_START_NOT_ENOUGH_PLAYERS });
    }

    if (!this.checkAllPlayersReady(players, hostId)) {
      throw new ConflictException({ code: WAITING_ERROR_CODES.NOT_ALL_PLAYERS_READY });
    }

    if (room.mode === RoomMode.TEAM) {
      const redCount = players.filter((p) => p.team === Team.RED).length;
      const blueCount = players.filter((p) => p.team === Team.BLUE).length;
      if (Math.abs(redCount - blueCount) > 1)
        throw new ConflictException({ code: WAITING_ERROR_CODES.TEAM_IMBALANCE });
    }

    await this.roomWriter.startGame(roomId);
  }

  async markRoomAsStarted(roomId: number): Promise<void> {
    await this.waitingState.setRoomExpiry(roomId, 3600);
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
    const players = await this.waitingState.getPlayers(roomId);
    const hostId = await this.waitingState.getHostId(roomId);
    return this.checkAllPlayersReady(players, hostId);
  }

  private async resetForModeChange(roomId: number, newMode: RoomMode): Promise<void> {
    const players = await this.waitingState.getPlayers(roomId);
    const hostId = await this.waitingState.getHostId(roomId);

    await Promise.all(
      players.map(async (player, i) => {
        const team = newMode === RoomMode.SOLO ? Team.NONE : i % 2 === 0 ? Team.RED : Team.BLUE;
        await this.waitingState.changeTeam(roomId, player.userId, team);
        if (player.userId !== hostId)
          await this.waitingState.setReady(roomId, player.userId, false);
      }),
    );
  }

  private checkAllPlayersReady(players: WaitingPlayerState[], hostId: number | null): boolean {
    const nonHostPlayers = players.filter((p) => p.userId !== hostId);
    return nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady);
  }

  private getInitialTeam(mode: RoomMode, existingPlayers: WaitingPlayerState[]): Team {
    if (mode === RoomMode.SOLO) return Team.NONE;
    const redCount = existingPlayers.filter((p) => p.team === Team.RED).length;
    const blueCount = existingPlayers.filter((p) => p.team === Team.BLUE).length;
    return redCount <= blueCount ? Team.RED : Team.BLUE;
  }
}
