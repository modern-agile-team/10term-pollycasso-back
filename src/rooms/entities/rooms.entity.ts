import { RoomMode } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export class Room {
  private constructor(
    public name: string,
    public mode: RoomMode,
    public maxPlayers: number,
    public isPrivate: boolean,
    public hasPassword: boolean,
  ) {}

  static create(
    name: string,
    mode: RoomMode,
    maxPlayers: number,
    isPrivate: boolean,
    hasPassword: boolean,
  ): Room {
    const room = new Room(name, mode, maxPlayers, isPrivate, hasPassword);
    room.validate();
    return room;
  }

  update(
    name?: string,
    mode?: RoomMode,
    maxPlayers?: number,
    isPrivate?: boolean,
    hasNewPassword?: boolean,
  ): void {
    if (name !== undefined) this.name = name;
    if (mode !== undefined) this.mode = mode;
    if (maxPlayers !== undefined) this.maxPlayers = maxPlayers;
    if (isPrivate !== undefined) this.isPrivate = isPrivate;

    if (hasNewPassword) {
      this.hasPassword = true;
    } else if (isPrivate === false) {
      this.hasPassword = false;
    }

    this.validate();
  }

  private validate(): void {
    if (this.mode === RoomMode.SOLO && (this.maxPlayers < 3 || this.maxPlayers > 6)) {
      throw new BadRequestException('SOLO 모드는 3~6명이어야 합니다.');
    }
    if (this.mode === RoomMode.TEAM && ![4, 6].includes(this.maxPlayers)) {
      throw new BadRequestException('TEAM 모드는 4명 또는 6명이어야 합니다.');
    }
    if (this.isPrivate && !this.hasPassword) {
      throw new BadRequestException('비공개 방은 비밀번호가 필요합니다.');
    }
    if (!this.isPrivate && this.hasPassword) {
      throw new BadRequestException('공개 방은 비밀번호를 설정할 수 없습니다.');
    }
  }

  static fromPersistence(data: {
    name: string;
    mode: RoomMode;
    maxPlayers: number;
    isPrivate: boolean;
    hashedPassword: string | null;
  }): Room {
    return new Room(data.name, data.mode, data.maxPlayers, data.isPrivate, !!data.hashedPassword);
  }

  toPersistence(hashedPassword: string | null) {
    return {
      name: this.name,
      mode: this.mode,
      maxPlayers: this.maxPlayers,
      isPrivate: this.isPrivate,
      hashedPassword,
    };
  }
}
