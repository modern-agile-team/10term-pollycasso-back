import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  HttpCode,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { ResRoomDto } from './dtos/responses/res-room.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(@Body() createRoomDto: CreateRoomDto) {
    const room = await this.roomsService.createRoom(createRoomDto);
    return new ResRoomDto(room);
  }

  @Get()
  async findAll(@Query() query: QueryRoomDto) {
    const { data, nextCursor, hasNextPage } = await this.roomsService.getRooms(query);
    return {
      data: data.map((room) => new ResRoomDto(room)),
      nextCursor,
      hasNextPage,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.getRoom(id);
    return new ResRoomDto(room);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    const room = await this.roomsService.updateRoom(id, updateRoomDto);
    return new ResRoomDto(room);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roomsService.deleteRoom(id);
  }
}
