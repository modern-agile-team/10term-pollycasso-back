import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({ example: 'maxPlayers' })
  field: string;

  @ApiProperty({ example: 'Solo mode allows 3-6 players only' })
  reason: string;
}

export class StandardErrorResponseDto {
  @ApiProperty({ example: 400 })
  status: number;

  @ApiProperty({ example: 'SOLO_MODE_PLAYERS' })
  code: string;

  @ApiProperty({ type: [ErrorDetailDto], example: [] })
  errors: ErrorDetailDto[];
}
