import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { Room } from './entities/rooms.entity';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import { ERROR_MESSAGES, ROOM_CONSTANTS } from './constants/room.constants';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly passwordEncoderService: PasswordEncoderService,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<Room> {
    const room = await Room.create(
      dto.name,
      dto.mode,
      dto.maxPlayers,
      dto.isPrivate ?? false,
      dto.password ?? null,
      this.passwordEncoderService,
    );
    return this.roomsRepository.create(room);
  }

  async getRoom(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOne(id);
    if (!room) {
      throw new NotFoundException(ERROR_MESSAGES.ROOM_NOT_FOUND(id));
    }
    return room;
  }

  async getRooms(query: QueryRoomDto): Promise<PaginationDto<Room>> {
    const rooms = await this.roomsRepository.findAll(query, ROOM_CONSTANTS.ROOMS_PER_PAGE);
    return new PaginationDto<Room>(rooms, ROOM_CONSTANTS.ROOMS_PER_PAGE);
  }

  async updateRoom(id: number, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.getRoom(id);

    await room.update(
      {
        name: dto.name,
        mode: dto.mode,
        maxPlayers: dto.maxPlayers,
        isPrivate: dto.isPrivate,
        plainPassword: dto.password,
      },
      this.passwordEncoderService,
    );

    return this.roomsRepository.update(id, room);
  }

  async deleteRoom(id: number): Promise<void> {
    await this.getRoom(id); 
    await this.roomsRepository.remove(id);
  }
}
