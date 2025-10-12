import { RoomMode, RoomStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRoomDto {
  @IsOptional()
  @IsString({ message: '방 이름은 문자열이어야 합니다.' })
  name?: string;

  @IsOptional()
  @IsEnum(RoomMode, { message: '모드는 SOLO 또는 TEAM 중 하나여야 합니다.' })
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
  @IsEnum(RoomStatus, { message: '상태는 WAITING, IN_PROGRESS 중 하나여야 합니다.' })
  status?: RoomStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '커서는 숫자여야 합니다.' })
  @Min(1, { message: '커서는 최소 1 이상이어야 합니다.' })
  cursor?: number;
}
