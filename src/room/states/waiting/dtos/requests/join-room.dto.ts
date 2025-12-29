import { IsInt, IsNumberString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinRoomDto {
  @IsInt()
  @ApiProperty({ description: '방 ID', example: 1 })
  roomId: number;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @Length(4, 4)
  @ApiProperty({
    description: '방 비밀번호 (비공개 방인 경우)',
    example: '1234',
    required: false,
  })
  password?: string;
}
