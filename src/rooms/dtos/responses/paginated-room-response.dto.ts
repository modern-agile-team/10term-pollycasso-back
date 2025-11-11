import { ApiProperty } from '@nestjs/swagger';
import { ResRoomDto } from './room-response.dto';

export class PaginatedRoomResponseDto {
  @ApiProperty({ type: [ResRoomDto] })
  rooms: ResRoomDto[];

  @ApiProperty({ type: Boolean, example: false })
  hasNextPage: boolean;

  @ApiProperty({ type: Number, nullable: true, example: null })
  nextCursor: number | null;

  constructor(params: { data: ResRoomDto[]; hasNextPage: boolean; nextCursor: number | null }) {
    this.rooms = params.data;
    this.hasNextPage = params.hasNextPage;
    this.nextCursor = params.nextCursor;
  }
}
