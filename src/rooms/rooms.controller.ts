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
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dtos/requests/create-room.dto';
import { UpdateRoomDto } from './dtos/requests/update-room.dto';
import { QueryRoomDto } from './dtos/requests/query-room.dto';
import { ResRoomDto } from './dtos/responses/res-room.dto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async create(@Body() body: CreateRoomDto): Promise<ResRoomDto> {
    const room = await this.roomsService.createRoom(body);
    return new ResRoomDto(room);
  }

  @Get()
  async findAll(@Query() query: QueryRoomDto): Promise<PaginationDto<ResRoomDto>> {
    const pagination = await this.roomsService.getRooms(query);
    return {
      data: pagination.data.map((room) => new ResRoomDto(room)),
      hasNextPage: pagination.hasNextPage,
      nextCursor: pagination.nextCursor,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ResRoomDto> {
    const room = await this.roomsService.getRoom(id);
    return new ResRoomDto(room);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateRoomDto,
  ): Promise<ResRoomDto> {
    const room = await this.roomsService.updateRoom(id, body);
    return new ResRoomDto(room);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.roomsService.deleteRoom(id);
  }
}
