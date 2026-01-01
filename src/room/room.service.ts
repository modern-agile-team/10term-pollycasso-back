import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { ROOM_CONSTANTS, ROOM_ERROR_CODES } from './constants/room.constant';
import { Room } from './entities/room.entity';
import type { IRoomsEventPublisher } from './events/room-event.publisher';
import type { IRoomsRepository } from './interfaces/room.repository.interface';
import { IRoomReader } from './interfaces/room-reader.interface';
import { IRoomWriter } from './interfaces/room-writer.interface';
import { RoomMode } from '@prisma/client';

@Injectable()
export class RoomsService implements IRoomReader, IRoomWriter {
  constructor(
    @Inject('IRoomsRepository')
    private readonly roomsRepository: IRoomsRepository,
    @Inject('IRoomsEventPublisher')
    private readonly roomsEventPublisher: IRoomsEventPublisher,
  ) {}

  async createRoom(dto: CreateRoomDto): Promise<Room> {
    const hashedPassword = dto.password ? await PasswordEncoderUtil.hash(dto.password) : null;

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

  async updateRoomWhileWaiting(
    roomId: number,
    payload: {
      name?: string;
      mode?: RoomMode;
      maxPlayers?: number;
      isPrivate?: boolean;
      password?: string;
    },
  ): Promise<Room> {
    const room = await this.getOneRoom(roomId);

    const hashedPassword = payload.password
      ? await PasswordEncoderUtil.hash(payload.password)
      : undefined;

    room.update({
      name: payload.name,
      mode: payload.mode,
      maxPlayers: payload.maxPlayers,
      isPrivate: payload.isPrivate,
      hashedPassword,
    });

    const updatedRoom = await this.roomsRepository.updateRoom(roomId, room);
    this.roomsEventPublisher.roomUpdated(updatedRoom);

    return updatedRoom;
  }

  async startGame(roomId: number): Promise<void> {
    const room = await this.getOneRoom(roomId);

    room.startGame();

    await this.roomsRepository.updateRoom(roomId, room);
    this.roomsEventPublisher.roomUpdated(room);
  }
}
