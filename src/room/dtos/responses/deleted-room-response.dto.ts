import { ApiProperty } from '@nestjs/swagger';

export class ResDeletedRoomDto {
  @ApiProperty({ description: '방 ID', example: 1 })
  readonly id: number;

  constructor(id: number) {
    this.id = id;
  }
}
