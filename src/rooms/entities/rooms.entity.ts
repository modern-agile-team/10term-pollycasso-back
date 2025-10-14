import { RoomMode, RoomStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { ERROR_MESSAGES, ROOM_CONSTANTS } from '../constants/room.constant';

interface RoomUpdateParams {
  name?: string;
  mode?: RoomMode;
  maxPlayers?: number;
  isPrivate?: boolean;
  plainPassword?: string | null;
  status?: RoomStatus;
}

export class Room {
  private constructor(
    private _id: number | null,
    public name: string,
    public mode: RoomMode,
    public maxPlayers: number,
    public currentPlayers: number,
    public isPrivate: boolean,
    private hashedPassword: string | null,
    private _status: RoomStatus,
  ) {
    this.validate();
  }

  static async create(
    name: string,
    mode: RoomMode,
    maxPlayers: number,
    isPrivate: boolean,
    plainPassword: string | null,
    passwordEncoder: PasswordEncoderService,
  ): Promise<Room> {
    if (!isPrivate && plainPassword) {
      throw new BadRequestException(ERROR_MESSAGES.PUBLIC_ROOM_NO_PASSWORD);
    }

    const hashedPassword = isPrivate ? await passwordEncoder.hash(plainPassword!) : null;

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

  get id(): number | null {
    return this._id;
  }

  get status(): RoomStatus {
    return this._status;
  }

  getHashedPassword(): string | null {
    return this.hashedPassword;
  }

  hasPassword(): boolean {
    return this.hashedPassword !== null;
  }

  async update(params: RoomUpdateParams, passwordEncoder: PasswordEncoderService): Promise<void> {
    if (params.name !== undefined) this.name = params.name;
    if (params.mode !== undefined) this.mode = params.mode;
    if (params.maxPlayers !== undefined) this.maxPlayers = params.maxPlayers;
    if (params.status !== undefined) this._status = params.status;

    if (params.isPrivate !== undefined) {
      this.isPrivate = params.isPrivate;
    }

    await this.updatePassword(params.plainPassword, passwordEncoder);

    this.validate();
  }

  private async updatePassword(
    plainPassword: string | null | undefined,
    passwordEncoder: PasswordEncoderService,
  ) {
    if (this.isPrivate) {
      if (plainPassword) {
        this.hashedPassword = await passwordEncoder.hash(plainPassword);
      } else if (!this.hasPassword()) {
        throw new BadRequestException(ERROR_MESSAGES.PRIVATE_ROOM_NEEDS_PASSWORD);
      }
    } else {
      if (plainPassword) {
        throw new BadRequestException(ERROR_MESSAGES.PUBLIC_ROOM_NO_PASSWORD);
      }
      this.hashedPassword = null;
    }
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
        throw new BadRequestException(ERROR_MESSAGES.SOLO_MODE_PLAYERS);
      }
    }

    if (
      this.mode === RoomMode.TEAM &&
      !(ROOM_CONSTANTS.TEAM_ALLOWED_PLAYERS as readonly number[]).includes(this.maxPlayers)
    ) {
      throw new BadRequestException(ERROR_MESSAGES.TEAM_MODE_PLAYERS);
    }
  }

  private validatePassword(): void {
    if (this.isPrivate && !this.hasPassword()) {
      throw new BadRequestException(ERROR_MESSAGES.PRIVATE_ROOM_NEEDS_PASSWORD);
    }
    if (!this.isPrivate && this.hasPassword()) {
      throw new BadRequestException(ERROR_MESSAGES.PUBLIC_ROOM_NO_PASSWORD);
    }
  }
}
