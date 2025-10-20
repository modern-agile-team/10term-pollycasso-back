import { RoomMode, RoomStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { ROOM_CONSTANTS, ERROR_CODES } from '../constants/room.constant';

interface RoomUpdateParams {
  name?: string;
  mode?: RoomMode;
  maxPlayers?: number;
  isPrivate?: boolean;
  hashedPassword?: string | null;
  status?: RoomStatus;
}

export class Room {
  private constructor(
    public id: number | null,
    public name: string,
    public mode: RoomMode,
    public maxPlayers: number,
    public currentPlayers: number,
    public isPrivate: boolean,
    private _hashedPassword: string | null,
    private _status: RoomStatus,
  ) {
    this.validate();
  }

  static create(
    name: string,
    mode: RoomMode,
    maxPlayers: number,
    isPrivate: boolean,
    hashedPassword: string | null,
  ): Room {
    return new Room(
      null,
      name,
      mode,
      maxPlayers,
      ROOM_CONSTANTS.INITIAL_CURRENT_PLAYERS,
      isPrivate,
      hashedPassword,
      RoomStatus.WAITING,
    );
  }

  static load(
    id: number,
    name: string,
    mode: RoomMode,
    maxPlayers: number,
    currentPlayers: number,
    isPrivate: boolean,
    hashedPassword: string | null,
    status: RoomStatus,
  ): Room {
    return new Room(id, name, mode, maxPlayers, currentPlayers, isPrivate, hashedPassword, status);
  }

  get status(): RoomStatus {
    return this._status;
  }

  get hashedPassword(): string | null {
    return this._hashedPassword;
  }

  async update(params: RoomUpdateParams): Promise<void> {
    if (params.name !== undefined) this.name = params.name;
    if (params.mode !== undefined) this.mode = params.mode;
    if (params.maxPlayers !== undefined) this.maxPlayers = params.maxPlayers;
    if (params.status !== undefined) this._status = params.status;
    if (params.isPrivate !== undefined) this.isPrivate = params.isPrivate;
    if (params.hashedPassword !== undefined) {
      this._hashedPassword = params.hashedPassword;
    }

    this.validate();
  }

  private validate(): void {
    this.validatePlayerCount();
    this.validatePassword();
  }

  private validatePlayerCount(): void {
    if (this.mode === RoomMode.SOLO) {
      if (
        this.maxPlayers < ROOM_CONSTANTS.SOLO_MIN_PLAYERS ||
        this.maxPlayers > ROOM_CONSTANTS.SOLO_MAX_PLAYERS
      ) {
        throw new BadRequestException(ERROR_CODES.SOLO_MODE_PLAYERS);
      }
    }

    if (
      this.mode === RoomMode.TEAM &&
      !(ROOM_CONSTANTS.TEAM_ALLOWED_PLAYERS as readonly number[]).includes(this.maxPlayers)
    ) {
      throw new BadRequestException(ERROR_CODES.TEAM_MODE_PLAYERS);
    }
  }

  private validatePassword(): void {
    if (this.isPrivate) {
      if (!this._hashedPassword) {
        throw new BadRequestException(ERROR_CODES.PRIVATE_ROOM_NEEDS_PASSWORD);
      }
    } else {
      this._hashedPassword = null;
    }
  }
}
