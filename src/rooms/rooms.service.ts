import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { ResRoomDto } from './dtos/responses/res-room.dto';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { PaginationService } from 'src/common/pagination/pagination.service';
import { PaginatedResult } from 'src/common/pagination/pagination.interface';
import { FindRoomsQuery } from './rooms.interface';
import { Room } from './rooms.entity';
import { ROOMS_PER_PAGE } from './rooms.constants';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly passwordEncoderService: PasswordEncoderService,
    private readonly paginationService: PaginationService,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<ResRoomDto> {
    const room = Room.create(
      dto.name,
      dto.mode,
      dto.maxPlayers,
      dto.isPrivate ?? false,
      !!dto.password,
    );

    const hashedPassword = dto.password
      ? await this.passwordEncoderService.hash(dto.password)
      : null;

    const prismaRoom = await this.roomsRepository.create(room.toPrisma(hashedPassword));
    return new ResRoomDto(prismaRoom);
  }

  async getRoom(id: number): Promise<ResRoomDto> {
    const prismaRoom = await this.roomsRepository.findOne(id);
    if (!prismaRoom) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    return new ResRoomDto(prismaRoom);
  }

  async getRooms(query: QueryRoomDto): Promise<PaginatedResult<ResRoomDto>> {
    const findQuery: FindRoomsQuery = {
      name: query.name,
      mode: query.mode,
      isPrivate: query.isPrivate,
      status: query.status,
      cursor: query.cursor,
    };

    const prismaRooms = await this.roomsRepository.findAll(findQuery);
    const { data, nextCursor, hasNextPage } = this.paginationService.paginateById(
      prismaRooms,
      ROOMS_PER_PAGE,
      query.cursor,
    );

    return {
      data: data.map((room) => new ResRoomDto(room)),
      nextCursor,
      hasNextPage,
    };
  }

  async updateRoom(id: number, dto: UpdateRoomDto): Promise<ResRoomDto> {
    const existingPrismaRoom = await this.roomsRepository.findOne(id);
    if (!existingPrismaRoom) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);

    const room = Room.fromPrisma(existingPrismaRoom);

    let hashedPassword = existingPrismaRoom.hashedPassword;
    const hasNewPassword = !!dto.password;

    if (hasNewPassword) {
      hashedPassword = await this.passwordEncoderService.hash(dto.password!);
    } else if (dto.isPrivate === false) {
      hashedPassword = null;
    }

    room.update(dto.name, dto.mode, dto.maxPlayers, dto.isPrivate, hasNewPassword);

    const updatedPrismaRoom = await this.roomsRepository.update(id, room.toPrisma(hashedPassword));
    return new ResRoomDto(updatedPrismaRoom);
  }

  async deleteRoom(id: number): Promise<void> {
    const prismaRoom = await this.roomsRepository.findOne(id);
    if (!prismaRoom) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    await this.roomsRepository.softDelete(id);
  }
}
