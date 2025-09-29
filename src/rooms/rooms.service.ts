import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomDto } from './dto/requests/create-room.dto';
import { UpdateRoomDto } from './dto/requests/update-room.dto';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { Room } from './rooms.entity';
import { QueryRoomDto } from './dto/requests/query-room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly passwordEncoderService: PasswordEncoderService,
  ) {}

  async createRoom(dto: CreateRoomDto) {
    const room = Room.create(dto);

    const hashedPassword = dto.password
      ? await this.passwordEncoderService.hash(dto.password)
      : null;

    return this.roomsRepository.create(room.toPrisma(hashedPassword));
  }

  async getRoom(id: number) {
    const room = await this.roomsRepository.findOne(id);
    if (!room) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    return room;
  }

  async getRooms(query: QueryRoomDto) {
    const { data, hasNextData, nextCursor } = await this.roomsRepository.findAll(query);
    return { rooms: data, hasNextData, nextCursor };
  }

  async updateRoom(id: number, dto: UpdateRoomDto) {
    const existingRoomData = await this.getRoom(id);
    const room = Room.fromPrisma(existingRoomData);

    let hashedPassword = existingRoomData.hashedPassword;
    const hasNewPassword = !!dto.password;

    if (hasNewPassword) {
      hashedPassword = await this.passwordEncoderService.hash(dto.password!);
    } else if (dto.isPrivate === false) {
      hashedPassword = null;
    }

    room.update(dto, hasNewPassword);

    return this.roomsRepository.update(id, room.toPrisma(hashedPassword));
  }

  async deleteRoom(id: number) {
    await this.getRoom(id);
    return this.roomsRepository.softDelete(id);
  }
}
