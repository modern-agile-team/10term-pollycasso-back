import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomsRepository } from './rooms.repository';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { FindRoomsQuery } from './rooms.interface';
import { Room } from './entities/rooms.entity';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Injectable()
export class RoomsService {
  private readonly ROOMS_PER_PAGE = 6;

  constructor(
    private readonly roomsRepository: RoomsRepository,
    private readonly passwordEncoderService: PasswordEncoderService,
  ) {}

  async createRoom(dto: CreateRoomDto) {
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

    return this.roomsRepository.create(room.toPersistence(hashedPassword));
  }

  async getRoom(id: number) {
    const prismaRoom = await this.roomsRepository.findOne(id);
    if (!prismaRoom) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    return prismaRoom;
  }

  async getRooms(query: QueryRoomDto) {
    const findQuery: FindRoomsQuery = {
      name: query.name,
      mode: query.mode,
      isPrivate: query.isPrivate,
      status: query.status,
      cursor: query.cursor,
    };

    const prismaRooms = await this.roomsRepository.findAll(findQuery);
    return new PaginationDto(prismaRooms, this.ROOMS_PER_PAGE, query.cursor);
  }

  async updateRoom(id: number, dto: UpdateRoomDto) {
    const existingPrismaRoom = await this.roomsRepository.findOne(id);
    if (!existingPrismaRoom) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);

    const room = Room.fromPersistence(existingPrismaRoom);

    let hashedPassword = existingPrismaRoom.hashedPassword;
    const hasNewPassword = !!dto.password;

    if (hasNewPassword) {
      hashedPassword = await this.passwordEncoderService.hash(dto.password!);
    } else if (dto.isPrivate === false) {
      hashedPassword = null;
    }

    room.update(dto.name, dto.mode, dto.maxPlayers, dto.isPrivate, hasNewPassword);

    return this.roomsRepository.update(id, room.toPersistence(hashedPassword));
  }

  async deleteRoom(id: number): Promise<void> {
    const prismaRoom = await this.roomsRepository.findOne(id);
    if (!prismaRoom) throw new NotFoundException(`${id}번 방이 존재하지 않습니다.`);
    await this.roomsRepository.remove(id);
  }
}
