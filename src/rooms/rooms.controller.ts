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
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { QueryRoomDto } from './dto/query-room.dto';
import { ResRoomDto } from './dto/res-room.dto';
import { ResCursorDto } from './dto/res-cursor.dto';

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
    const { rooms, hasNextData, nextCursor } = await this.roomsService.getRooms(query);
    return ResCursorDto.fromEntities(rooms, nextCursor, hasNextData);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const room = await this.roomsService.getRoom(id);
    return new ResRoomDto(room);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateRoomDto: UpdateRoomDto) {
    const updatedRoom = await this.roomsService.updateRoom(id, updateRoomDto);
    return new ResRoomDto(updatedRoom);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.roomsService.deleteRoom(id);
  }
}
