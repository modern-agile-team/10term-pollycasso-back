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
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomMode } from '@prisma/client';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  @ApiProperty({
    description: '방 이름',
    example: '제발 들어와',
    maxLength: 15,
    required: false,
  })
  name?: string;

  @IsOptional()
  @IsEnum(RoomMode)
  @ApiProperty({
    description: '방 모드',
    example: RoomMode.SOLO,
    enum: RoomMode,
    required: false,
  })
  mode?: RoomMode;

  @IsOptional()
  @IsInt()
  @ApiProperty({
    description: '최대 인원 수 (SOLO: 3 ~ 6명, TEAM: 4명 또는 6명)',
    example: 5,
    required: false,
  })
  maxPlayers?: number;

  @IsOptional()
  @IsBoolean()
  @ApiProperty({
    description: '비공개 여부',
    example: true,
    required: false,
  })
  isPrivate?: boolean;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @Length(4, 4)
  @ApiProperty({
    description: '비공개 방 비밀번호 (4자리 숫자)',
    example: '1234',
    required: false,
    minLength: 4,
    maxLength: 4,
  })
  password?: string;
}
