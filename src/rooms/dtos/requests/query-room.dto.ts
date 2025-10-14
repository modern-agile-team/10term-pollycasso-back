import { RoomMode, RoomStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryRoomDto {
  @IsOptional()
  @IsString({ message: '방 이름은 문자열이어야 합니다.' })
  name?: string;

  @IsOptional()
  @IsEnum(RoomMode, { message: '모드는 SOLO 또는 TEAM이어야 합니다.' })
  mode?: RoomMode;

  @IsOptional()
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: '비공개 여부는 true 또는 false이어야 합니다.' })
  isPrivate?: boolean;

  @IsOptional()
  @IsEnum(RoomStatus, { message: '방 상태는 WAITING 또는 IN_PROGRESS이어야 합니다.' })
  status?: RoomStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '커서는 정수여야 합니다.' })
  cursor?: number;
}
