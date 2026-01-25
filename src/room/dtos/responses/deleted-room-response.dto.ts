import { ApiProperty } from '@nestjs/swagger';

export class DeletedRoomResponseDto {
  @ApiProperty({ description: '방 ID', example: 1 })
  readonly id: number;

  constructor(id: number) {
    this.id = id;
  }
}
