import { RoomMode, RoomStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { ROOM_CONSTANTS, ERROR_CODES } from '../constants/room.constant';

export interface RoomProps {
  name: string;
  mode: RoomMode;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  hashedPassword: string | null;
  status: RoomStatus;
}

interface CreateRoomProps {
  name: string;
  mode: RoomMode;
  maxPlayers: number;
  isPrivate: boolean;
  hashedPassword: string | null;
}

interface UpdateRoomProps {
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
    private props: RoomProps,
  ) {
    this.validate();
  }

  static create(props: CreateRoomProps): Room {
    const { name, mode, maxPlayers, isPrivate, hashedPassword } = props;
    return new Room(null, {
      name,
      mode,
      maxPlayers,
      currentPlayers: ROOM_CONSTANTS.INITIAL_CURRENT_PLAYERS,
      isPrivate,
      hashedPassword,
      status: RoomStatus.WAITING,
    });
  }

  static load(id: number, props: RoomProps): Room {
    return new Room(id, props);
  }

  get name() {
    return this.props.name;
  }

  get mode() {
    return this.props.mode;
  }

  get maxPlayers() {
    return this.props.maxPlayers;
  }

  get currentPlayers() {
    return this.props.currentPlayers;
  }

  get isPrivate() {
    return this.props.isPrivate;
  }

  get hashedPassword() {
    return this.props.hashedPassword;
  }

  get status() {
    return this.props.status;
  }

  update(props: UpdateRoomProps): void {
    if (props.name !== undefined) this.props.name = props.name;
    if (props.mode !== undefined) this.props.mode = props.mode;
    if (props.maxPlayers !== undefined) this.props.maxPlayers = props.maxPlayers;
    if (props.status !== undefined) this.props.status = props.status;
    if (props.isPrivate !== undefined) this.props.isPrivate = props.isPrivate;
    if (props.hashedPassword !== undefined) this.props.hashedPassword = props.hashedPassword;

    this.validate();
  }

  private validate(): void {
    this.validatePlayerCount();
    this.validatePassword();
  }

  private validatePlayerCount(): void {
    if (this.props.mode === RoomMode.SOLO) {
      if (
        this.props.maxPlayers < ROOM_CONSTANTS.SOLO_MIN_PLAYERS ||
        this.props.maxPlayers > ROOM_CONSTANTS.SOLO_MAX_PLAYERS
      ) {
        throw new BadRequestException(ERROR_CODES.SOLO_MODE_PLAYERS);
      }
    }

    if (
      this.props.mode === RoomMode.TEAM &&
      !(ROOM_CONSTANTS.TEAM_ALLOWED_PLAYERS as readonly number[]).includes(this.props.maxPlayers)
    ) {
      throw new BadRequestException(ERROR_CODES.TEAM_MODE_PLAYERS);
    }
  }

  private validatePassword(): void {
    if (this.props.isPrivate) {
      if (!this.props.hashedPassword) {
        throw new BadRequestException(ERROR_CODES.PRIVATE_ROOM_NEEDS_PASSWORD);
      }
    } else {
      this.props.hashedPassword = null;
    }
  }
}
