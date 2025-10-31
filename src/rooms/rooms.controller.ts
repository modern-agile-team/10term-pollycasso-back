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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { ResRoomDto } from './dtos/responses/room-response.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { ApiRoom } from './room.swagger';
import { PaginatedRoomResponseDto } from './dtos/responses/paginated-room-response.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiRoom.createRoom()
  async createRoom(@Body() body: CreateRoomDto): Promise<ResRoomDto> {
    const room = await this.roomsService.createRoom(body);
    return new ResRoomDto(room);
  }

  @Get()
  @ApiRoom.getAllRooms()
  async getAllRooms(@Query() query: QueryRoomDto): Promise<PaginatedRoomResponseDto> {
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
  async getOneRoom(@Param('id', ParseIntPipe) id: number): Promise<ResRoomDto> {
    const room = await this.roomsService.getOneRoom(id);
    return new ResRoomDto(room);
  }

  @Patch(':id')
  @ApiRoom.updateRoom()
  async updateRoom(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomDto,
  ): Promise<ResRoomDto> {
    const room = await this.roomsService.updateRoom(id, body);
    return new ResRoomDto(room);
  }

  @Delete(':id')
  @ApiRoom.removeRoom()
  @HttpCode(204)
  async removeRoom(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.roomsService.removeRoom(id);
  }
}
