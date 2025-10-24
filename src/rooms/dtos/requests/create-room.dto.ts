import { ApiProperty } from '@nestjs/swagger';
import { RoomMode } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  @ApiProperty({
    description: '방 이름',
    example: '제발 들어와',
    maxLength: 15,
  })
  name: string;

  @IsEnum(RoomMode)
  @ApiProperty({
    description: '방 모드',
    example: RoomMode.SOLO,
    enum: RoomMode,
  })
  mode: RoomMode;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  @ApiProperty({
    description: '최대 인원 수 (SOLO: 3 ~ 6명, TEAM: 4명 또는 6명)',
    example: 5,
  })
  maxPlayers: number;

  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @ApiProperty({
    description: '비공개 여부',
    example: true,
  })
  isPrivate: boolean;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @Length(4, 4)
  @ApiProperty({
    description: '비공개 방 비밀번호 (4자리 숫자)',
    example: '1234',
    required: false,
  })
  password?: string;
}
