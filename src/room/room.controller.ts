import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { PaginatedRoomResponseDto } from './dtos/responses/paginated-room-response.dto';
import { RoomResponseDto } from './dtos/responses/room-response.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ApiRoom } from './room.swagger';

@Controller('rooms')
@UseGuards(AccessTokenGuard)
export class RoomController {
  constructor(private readonly roomsService: RoomService) {}

  @Post()
  @ApiRoom.createRoom()
  async createRoom(@Body() body: CreateRoomDto) {
    const room = await this.roomsService.createRoom(body);
    return new RoomResponseDto(room);
  }

  @Get()
  @ApiRoom.getAllRooms()
  async getAllRooms(@Query() query: QueryRoomDto) {
    const { data, hasNextPage, nextCursor } = await this.roomsService.getAllRooms(query);
    const mappedRooms = data.map((room) => new RoomResponseDto(room));
    return new PaginatedRoomResponseDto({
      data: mappedRooms,
      hasNextPage,
      nextCursor,
    });
  }

  @Get(':id')
  @ApiRoom.getOneRoom()
  async getOneRoom(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.getOneRoom(id);
    return new RoomResponseDto(room);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiRoom.removeRoom()
  async removeRoom(@Param('id', ParseIntPipe) id: number) {
    await this.roomsService.removeRoom(id);
  }
}
