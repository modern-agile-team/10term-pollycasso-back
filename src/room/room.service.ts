import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { ROOM_CONSTANTS, ROOM_ERROR_CODES } from './constants/room.constant';
import type { IRoomsRepository } from './interfaces/room.repository';
import { Room } from './entities/room.entity';
import type { IRoomsEventPublisher } from './events/room-event.publisher';

@Injectable()
export class RoomsService {
  constructor(
    @Inject('IRoomsRepository')
    private readonly roomsRepository: IRoomsRepository,
    @Inject('IRoomsEventPublisher')
    private readonly roomsEventPublisher: IRoomsEventPublisher,
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

    const createdRoom = await this.roomsRepository.createRoom(room);
    this.roomsEventPublisher.roomCreated(createdRoom);

    return createdRoom;
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

    const updatedRoom = await this.roomsRepository.updateRoom(id, room);
    this.roomsEventPublisher.roomUpdated(updatedRoom);

    return updatedRoom;
  }

  async getOneRoom(id: number): Promise<Room> {
    const room = await this.roomsRepository.findOneRoom(id);
    if (!room) throw new NotFoundException({ code: ROOM_ERROR_CODES.ROOM_NOT_FOUND });
    return room;
  }

  async getAllRooms(query: QueryRoomDto) {
    return this.roomsRepository.findAllRooms(query, ROOM_CONSTANTS.ROOMS_PER_PAGE);
  }

  async removeRoom(id: number): Promise<void> {
    await this.getOneRoom(id);
    await this.roomsRepository.deleteRoom(id);
    this.roomsEventPublisher.roomDeleted(id);
  }
}
