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
  @IsString({ message: '방 이름은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '방 이름은 필수입니다.' })
  @MaxLength(15, { message: '방 이름은 최대 15자까지 입력할 수 있습니다.' })
  name: string;

  @IsEnum(RoomMode, { message: '모드는 SOLO 또는 TEAM 중 하나여야 합니다.' })
  mode: RoomMode;

  @IsInt({ message: '최대 인원은 숫자여야 합니다.' })
  @Type(() => Number)
  @Min(1, { message: '인원은 최소 1명이어야 합니다.' })
  maxPlayers: number;

  @IsOptional()
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: '비공개 여부는 true 또는 false이어야 합니다.' })
  isPrivate?: boolean;

  @IsOptional()
  @IsNumberString({ no_symbols: true }, { message: '비밀번호는 숫자만 입력 가능합니다.' })
  @Length(4, 4, { message: '비밀번호는 4자리여야 합니다.' })
  password?: string;
}
