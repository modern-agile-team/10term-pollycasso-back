import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { PasswordEncoderUtil } from 'src/common/hashing/password-encoder.util';
import { ERROR_CODES, ROOM_CONSTANTS } from './constants/room.constant';
import type { IRoomsRepository } from './interfaces/rooms.repository.interface';
import { Room } from './entities/rooms.entity';

@Injectable()
export class RoomsService {
  constructor(
    @Inject('IRoomsRepository')
    private readonly roomsRepository: IRoomsRepository,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<Room> {
    const hashedPassword =
      dto.isPrivate && dto.password ? await PasswordEncoderUtil.hash(dto.password) : null;

    const room = Room.create({
      name: dto.name,
      mode: dto.mode,
      maxPlayers: dto.maxPlayers,
      isPrivate: dto.isPrivate,
      hashedPassword,
    });

    return this.roomsRepository.createRoom(room);
  }

  async updateRoom(id: number, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.getOneRoom(id);

    const hashedPassword =
      dto.isPrivate && dto.password ? await PasswordEncoderUtil.hash(dto.password) : null;

    room.update({
      name: dto.name,
      mode: dto.mode,
      maxPlayers: dto.maxPlayers,
      isPrivate: dto.isPrivate,
      hashedPassword,
    });

    return this.roomsRepository.updateRoom(id, room);
  }

  async getOneRoom(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOneRoom(id);
    if (!room) throw new NotFoundException({ code: ERROR_CODES.ROOM_NOT_FOUND });
    return room;
  }

  async getAllRooms(query: QueryRoomDto) {
    return this.roomsRepository.findAllRooms(query, ROOM_CONSTANTS.ROOMS_PER_PAGE);
  }

  async removeRoom(id: number): Promise<void> {
    await this.getOneRoom(id);
    await this.roomsRepository.deleteRoom(id);
  }
}
