import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { RoomInterface, RoomQueryInterface } from './rooms.interface';
import { RoomMode } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly passwordEncoderService: PasswordEncoderService,
  ) {}

  private validateRoomCapacity(mode: RoomMode, maxPlayers: number) {
    if (mode === RoomMode.SOLO && (maxPlayers < 3 || maxPlayers > 6)) {
      throw new BadRequestException('SOLO 모드는 3~6명이어야 합니다.');
    }
    if (mode === RoomMode.TEAM && maxPlayers !== 4 && maxPlayers !== 6) {
      throw new BadRequestException('TEAM 모드는 4명 또는 6명이어야 합니다.');
    }
  }

  private async hashPasswordIfNeeded(
    password?: string,
    isPrivate?: boolean,
    currentHash: string | null = null,
  ): Promise<string | null> {
    if (isPrivate === false) {
      if (password) throw new BadRequestException('공개 방은 비밀번호를 설정할 수 없습니다.');
      return null;
    }

    if (isPrivate === true && !password) {
      throw new BadRequestException('비공개 방은 비밀번호가 필요합니다.');
    }

    return password ? await this.passwordEncoderService.hash(password) : currentHash;
  }

  async createRoom(createRoomDto: CreateRoomDto) {
    this.validateRoomCapacity(createRoomDto.mode, createRoomDto.maxPlayers);

    const hashedPassword = await this.hashPasswordIfNeeded(
      createRoomDto.password,
      createRoomDto.isPrivate,
    );

    const roomData: RoomInterface = {
      name: createRoomDto.name,
      mode: createRoomDto.mode,
      maxPlayers: createRoomDto.maxPlayers,
      isPrivate: createRoomDto.isPrivate,
      hashedPassword,
    };

    return this.roomsRepository.create(roomData);
  }

  async getRooms(query: RoomQueryInterface) {
    const { data, hasNextData, nextCursor } = await this.roomsRepository.findAll(query);
    return { rooms: data, hasNextData, nextCursor };
  }

  async getRoom(id: number) {
    const room = await this.roomsRepository.findOne(id);
    if (!room) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    return room;
  }

  async updateRoom(id: number, updateRoomDto: UpdateRoomDto) {
    const room = await this.getRoom(id);

    if (updateRoomDto.maxPlayers !== undefined) {
      const mode = updateRoomDto.mode ?? room.mode;
      this.validateRoomCapacity(mode, updateRoomDto.maxPlayers);
    }

    const hashedPassword = await this.hashPasswordIfNeeded(
      updateRoomDto.password,
      updateRoomDto.isPrivate,
      room.hashedPassword,
    );

    const roomData: RoomInterface = {
      name: updateRoomDto.name ?? room.name,
      mode: updateRoomDto.mode ?? room.mode,
      maxPlayers: updateRoomDto.maxPlayers ?? room.maxPlayers,
      isPrivate: updateRoomDto.isPrivate ?? room.isPrivate,
      hashedPassword,
    };

    return this.roomsRepository.update(id, roomData);
  }

  async deleteRoom(id: number) {
    await this.getRoom(id);
    await this.roomsRepository.softDelete(id);
  }
}
