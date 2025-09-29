import { RoomMode } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';

export class Room {
  private constructor(
    public name: string,
    public mode: RoomMode,
    public maxPlayers: number,
    public isPrivate: boolean,
    public hasPassword: boolean,
  ) {}

  static create(dto: CreateRoomDto): Room {
    const room = new Room(
      dto.name,
      dto.mode,
      dto.maxPlayers,
      dto.isPrivate ?? false,
      !!dto.password,
    );
    room.validate();
    return room;
  }

  update(dto: UpdateRoomDto, hasNewPassword: boolean): void {
    if (dto.name !== undefined) this.name = dto.name;
    if (dto.mode !== undefined) this.mode = dto.mode;
    if (dto.maxPlayers !== undefined) this.maxPlayers = dto.maxPlayers;
    if (dto.isPrivate !== undefined) this.isPrivate = dto.isPrivate;

    if (hasNewPassword) {
      this.hasPassword = true;
    } else if (dto.isPrivate === false) {
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

  static fromPrisma(data: {
    name: string;
    mode: RoomMode;
    maxPlayers: number;
    isPrivate: boolean;
    hashedPassword: string | null;
  }): Room {
    return new Room(data.name, data.mode, data.maxPlayers, data.isPrivate, !!data.hashedPassword);
  }

  toPrisma(hashedPassword: string | null) {
    return {
      name: this.name,
      mode: this.mode,
      maxPlayers: this.maxPlayers,
      isPrivate: this.isPrivate,
      hashedPassword,
    };
  }
}
