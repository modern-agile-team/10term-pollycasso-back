import { ApiProperty } from '@nestjs/swagger';
import { RoomMode, RoomStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRoomDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '방 이름',
    required: false,
  })
  name?: string;

  @IsOptional()
  @IsEnum(RoomMode)
  @ApiProperty({
    description: '방 모드',
    enum: RoomMode,
    required: false,
  })
  mode?: RoomMode;

  @IsOptional()
  @Transform(({ value }): boolean => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @ApiProperty({
    description: '방 비공개 여부',
    required: false,
  })
  isPrivate?: boolean;

  @IsOptional()
  @IsEnum(RoomStatus)
  @ApiProperty({
    description: '방 상태',
    enum: RoomStatus,
    required: false,
  })
  status?: RoomStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: '페이지네이션 커서 (마지막으로 불러온 방 ID)',
    required: false,
  })
  cursor?: number;
}
