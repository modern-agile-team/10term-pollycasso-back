import { RoomMode, RoomStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class QueryRoomDto {
  @IsOptional()
  @IsInt({ message: '커서는 숫자여야 합니다.' })
  @Type(() => Number)
  cursor?: number;

  @IsOptional()
  @IsString({ message: '방 이름은 문자열이어야 합니다.' })
  name?: string;

  @IsOptional()
  @IsEnum(RoomMode, { message: '모드는 SOLO 또는 TEAM 중 하나여야 합니다.' })
  mode?: RoomMode;

  @IsOptional()
  @IsEnum(RoomStatus, { message: '상태는 WAITING 또는 IN_PROGRESS 중 하나여야 합니다.' })
  status?: RoomStatus;
}
