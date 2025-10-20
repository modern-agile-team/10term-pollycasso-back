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
  name: string;

  @IsEnum(RoomMode)
  mode: RoomMode;

  @IsInt()
  @Type(() => Number)
  @Min(1)
  maxPlayers: number;

  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isPrivate: boolean;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  @Length(4, 4)
  password?: string;
}
