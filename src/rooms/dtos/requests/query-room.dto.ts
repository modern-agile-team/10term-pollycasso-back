import { ApiProperty } from '@nestjs/swagger';
import { RoomMode, RoomStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRoomDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    description: '검색 키워드 (숫자면 ID)',
    required: false,
  })
  q?: string;

  @IsOptional()
  @IsEnum(RoomMode)
  @ApiProperty({
    description: '방 모드',
    enum: RoomMode,
    required: false,
  })
  mode?: RoomMode;

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
    minimum: 1,
  })
  cursor?: number;
}
