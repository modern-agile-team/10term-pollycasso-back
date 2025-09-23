import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsRepository } from './rooms.repository';
import { QueryRoomDto } from './dto/query-room.dto';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
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

  private async getHashedPasswordForRoom(
    password?: string,
    isPrivate?: boolean,
    currentHashedPassword: string | null = null,
  ): Promise<string | null> {
    if (isPrivate === false) {
      if (password) throw new BadRequestException('공개 방은 비밀번호를 설정할 수 없습니다.');
      return null;
    }

    if (isPrivate === true) {
      if (!password) throw new BadRequestException('비공개 방은 비밀번호가 필요합니다.');
      return await this.passwordEncoderService.hash(password);
    }

    if (password) return await this.passwordEncoderService.hash(password);

    return currentHashedPassword;
  }

  // 방 생성
  async create(createRoomDto: CreateRoomDto) {
    this.validateRoomCapacity(createRoomDto.mode, createRoomDto.maxPlayers);

    const hashedPassword = await this.getHashedPasswordForRoom(
      createRoomDto.password,
      createRoomDto.isPrivate,
    );

    const createData = { ...createRoomDto, hashedPassword };
    delete createData.password;
    return await this.roomsRepository.create(createData);
  }

  // 전체 방 조회
  async findAll(query: QueryRoomDto) {
    const { data, hasNextData, nextCursor } = await this.roomsRepository.findAll(query);
    return {
      data,
      hasNextData: hasNextData,
      nextCursor,
    };
  }

  // 단일 방 조회
  async findOne(id: number) {
    const room = await this.roomsRepository.findOne(id);
    if (!room) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    return room;
  }

  // 방 수정
  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const room = await this.findOne(id);

    if (updateRoomDto.maxPlayers !== undefined) {
      const mode = updateRoomDto.mode ?? room.mode;
      this.validateRoomCapacity(mode, updateRoomDto.maxPlayers);
    }

    const hashedPassword = await this.getHashedPasswordForRoom(
      updateRoomDto.password,
      updateRoomDto.isPrivate,
      room.hashedPassword,
    );

    const updateData = { ...updateRoomDto, hashedPassword };
    delete updateData.password;
    return this.roomsRepository.update(id, updateData);
  }

  // 방 삭제 (soft delete)
  async remove(id: number) {
    await this.findOne(id);
    await this.roomsRepository.softDelete(id);
  }
}
