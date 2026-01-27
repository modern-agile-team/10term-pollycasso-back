import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Room } from 'src/room/entities/room.entity';
import { RoomStatus, RoomMode, Team } from '@prisma/client';
import { WAITING_ERROR_CODES, WAITING_DOMAIN_ERRORS } from '../constants/waiting.constant';
import { ROOM_CONSTANTS } from 'src/room/constants/room.constant';
import { WaitingPlayerState } from '../waiting.store';

export interface TeamResetCommand {
  userId: number;
  newTeam: Team;
  shouldResetReady: boolean;
}

export class Waiting {
  private constructor(
    public readonly room: Room,
    public readonly players: WaitingPlayerState[],
    public readonly hostId: number | null,
  ) {}

  static load(room: Room, players: WaitingPlayerState[], hostId: number | null): Waiting {
    return new Waiting(room, players, hostId);
  }

  canJoin(userId: number): void {
    if (this.players.some((p) => p.userId === userId)) {
      return;
    }

    if (this.room.status !== RoomStatus.WAITING) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.GAME_ALREADY_STARTED,
      });
    }

    if (this.players.length >= this.room.maxPlayers) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.ROOM_FULL,
      });
    }
  }

  requiresPassword(): boolean {
    return this.room.isPrivate && !!this.room.hashedPassword;
  }

  hasPlayer(userId: number): boolean {
    return this.players.some((p) => p.userId === userId);
  }

  isEmpty(): boolean {
    return this.players.length === 0;
  }

  getInitialTeam(): Team {
    if (this.room.mode === RoomMode.SOLO) {
      return Team.NONE;
    }

    const redCount = this.players.filter((p) => p.team === Team.RED).length;
    const blueCount = this.players.filter((p) => p.team === Team.BLUE).length;
    return redCount <= blueCount ? Team.RED : Team.BLUE;
  }

  validateToggleReady(userId: number): void {
    if (this.hostId === userId) {
      throw new ForbiddenException({
        code: WAITING_ERROR_CODES.HOST_CANNOT_TOGGLE_READY,
      });
    }
    this.findPlayerOrThrow(userId);
  }

  validateTeamChange(userId: number, newTeam: Team): void {
    if (this.room.mode === RoomMode.SOLO) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.SOLO_MODE_NO_TEAMS,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.SOLO_MODE_NO_TEAMS]],
      });
    }

    if (newTeam === Team.NONE) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.INVALID_TEAM,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.INVALID_TEAM]],
      });
    }

    this.findPlayerOrThrow(userId);

    const maxPerTeam = Math.ceil(this.room.maxPlayers / 2);
    const targetTeamCount = this.players.filter(
      (p) => p.team === newTeam && p.userId !== userId,
    ).length;

    if (targetTeamCount >= maxPerTeam) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.TEAM_FULL,
      });
    }
  }

  validateKick(requesterId: number, targetUserId: number): void {
    if (this.hostId !== requesterId) {
      throw new ForbiddenException({
        code: WAITING_ERROR_CODES.PERMISSION_DENIED,
      });
    }

    if (requesterId === targetUserId) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.CANNOT_KICK_SELF,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.CANNOT_KICK_SELF]],
      });
    }
  }

  validateSettingsUpdate(requesterId: number): void {
    if (this.hostId !== requesterId) {
      throw new ForbiddenException({
        code: WAITING_ERROR_CODES.PERMISSION_DENIED,
      });
    }
  }

  validatePlayerExists(userId: number): void {
    this.findPlayerOrThrow(userId);
  }

  validateMaxPlayersUpdate(newMaxPlayers: number): void {
    if (newMaxPlayers < this.players.length) {
      throw new BadRequestException({
        code: WAITING_ERROR_CODES.MAX_PLAYERS_LESS_THAN_CURRENT,
        errors: [WAITING_DOMAIN_ERRORS[WAITING_ERROR_CODES.MAX_PLAYERS_LESS_THAN_CURRENT]],
      });
    }
  }

  shouldResetTeamsForMode(newMode: RoomMode): boolean {
    return this.room.mode !== newMode;
  }

  generateTeamResetCommands(newMode: RoomMode): TeamResetCommand[] {
    return this.players.map((player, index) => {
      const newTeam =
        newMode === RoomMode.SOLO ? Team.NONE : index % 2 === 0 ? Team.RED : Team.BLUE;

      const shouldResetReady = player.userId !== this.hostId;

      return {
        userId: player.userId,
        newTeam,
        shouldResetReady,
      };
    });
  }

  validateGameStart(requesterId: number): void {
    this.validateStartPermission(requesterId);
    this.validateRoomStatus();
    this.validatePlayerCount();
    this.validateAllPlayersReady();
    this.validateTeamBalance();
  }

  private validateStartPermission(requesterId: number): void {
    if (this.hostId !== requesterId) {
      throw new ForbiddenException({
        code: WAITING_ERROR_CODES.GAME_START_NOT_HOST,
      });
    }
  }

  private validateRoomStatus(): void {
    if (this.room.status !== RoomStatus.WAITING) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.GAME_ALREADY_STARTED,
      });
    }
  }

  private validatePlayerCount(): void {
    if (this.room.mode === RoomMode.SOLO) {
      if (this.players.length < ROOM_CONSTANTS.SOLO_MIN_PLAYERS) {
        throw new ConflictException({
          code: WAITING_ERROR_CODES.GAME_START_NOT_ENOUGH_PLAYERS,
        });
      }
    } else if (!ROOM_CONSTANTS.TEAM_ALLOWED_PLAYERS.includes(this.players.length)) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.GAME_START_NOT_ENOUGH_PLAYERS,
      });
    }
  }

  private validateAllPlayersReady(): void {
    const nonHostPlayers = this.players.filter((p) => p.userId !== this.hostId);
    const allReady = nonHostPlayers.length > 0 && nonHostPlayers.every((p) => p.isReady);

    if (!allReady) {
      throw new ConflictException({
        code: WAITING_ERROR_CODES.NOT_ALL_PLAYERS_READY,
      });
    }
  }

  private validateTeamBalance(): void {
    if (this.room.mode === RoomMode.TEAM) {
      const redCount = this.players.filter((p) => p.team === Team.RED).length;
      const blueCount = this.players.filter((p) => p.team === Team.BLUE).length;

      if (Math.abs(redCount - blueCount) > 1) {
        throw new ConflictException({
          code: WAITING_ERROR_CODES.TEAM_IMBALANCE,
        });
      }
    }
  }

  private findPlayerOrThrow(userId: number): WaitingPlayerState {
    const player = this.players.find((p) => p.userId === userId);
    if (!player) {
      throw new NotFoundException({
        code: WAITING_ERROR_CODES.PLAYER_NOT_FOUND,
      });
    }
    return player;
  }
}
