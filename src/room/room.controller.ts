import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpCode,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RoomsService } from './room.service';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { PaginatedRoomResponseDto } from './dtos/responses/paginated-room-response.dto';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { AccessTokenGuard } from 'src/auth/guard/access-token.guard';
import { ApiRoom } from './room.swagger';

@Controller('rooms')
@UseGuards(AccessTokenGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiRoom.createRoom()
  async createRoom(@Body() body: CreateRoomDto) {
    const room = await this.roomsService.createRoom(body);
    return new ResRoomDto(room);
  }

  @Get()
  @ApiRoom.getAllRooms()
  async getAllRooms(@Query() query: QueryRoomDto) {
    const { data, hasNextPage, nextCursor } = await this.roomsService.getAllRooms(query);
    const mappedRooms = data.map((room) => new ResRoomDto(room));
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
    return new ResRoomDto(room);
  }

  @Patch(':id')
  @ApiRoom.updateRoom()
  async updateRoom(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateRoomDto) {
    const room = await this.roomsService.updateRoom(id, body);
    return new ResRoomDto(room);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiRoom.removeRoom()
  async removeRoom(@Param('id', ParseIntPipe) id: number) {
    await this.roomsService.removeRoom(id);
  }
}
