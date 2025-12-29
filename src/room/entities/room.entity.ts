import { RoomMode, RoomStatus } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ROOM_CONSTANTS, ROOM_DOMAIN_ERRORS, ROOM_ERROR_CODES } from '../constants/room.constant';

export interface RoomProps {
  name: string;
  mode: RoomMode;
  maxPlayers: number;
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
    const updates = Object.fromEntries(
      Object.entries(props).filter(([, value]) => value !== undefined),
    );

    Object.assign(this.props, updates);

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
        throw new BadRequestException({
          code: ROOM_ERROR_CODES.SOLO_MODE_PLAYERS,
          errors: [ROOM_DOMAIN_ERRORS[ROOM_ERROR_CODES.SOLO_MODE_PLAYERS]],
        });
      }
    }

    if (
      this.props.mode === RoomMode.TEAM &&
      !ROOM_CONSTANTS.TEAM_ALLOWED_PLAYERS.includes(this.props.maxPlayers)
    ) {
      throw new BadRequestException({
        code: ROOM_ERROR_CODES.TEAM_MODE_PLAYERS,
        errors: [ROOM_DOMAIN_ERRORS[ROOM_ERROR_CODES.TEAM_MODE_PLAYERS]],
      });
    }
  }

  private validatePassword(): void {
    if (this.props.isPrivate) {
      if (!this.props.hashedPassword) {
        throw new BadRequestException({
          code: ROOM_ERROR_CODES.PRIVATE_ROOM_NEEDS_PASSWORD,
          errors: [ROOM_DOMAIN_ERRORS[ROOM_ERROR_CODES.PRIVATE_ROOM_NEEDS_PASSWORD]],
        });
      }
    } else {
      this.props.hashedPassword = null;
    }
  }

  startGame(): void {
    if (this.props.status !== RoomStatus.WAITING) {
      throw new ConflictException({
        code: ROOM_ERROR_CODES.ROOM_NOT_WAITING,
        errors: [ROOM_DOMAIN_ERRORS[ROOM_ERROR_CODES.ROOM_NOT_WAITING]],
      });
    }
    this.props.status = RoomStatus.IN_PROGRESS;
  }

  finishGame(): void {
    if (this.props.status !== RoomStatus.IN_PROGRESS) {
      throw new ConflictException({
        code: ROOM_ERROR_CODES.ROOM_NOT_IN_PROGRESS,
        errors: [ROOM_DOMAIN_ERRORS[ROOM_ERROR_CODES.ROOM_NOT_IN_PROGRESS]],
      });
    }
    this.props.status = RoomStatus.WAITING;
  }
}
