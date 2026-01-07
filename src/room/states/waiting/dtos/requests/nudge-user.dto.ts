import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NudgeUserDto {
  @IsInt()
  @ApiProperty({
    description: '재촉할 플레이어 ID',
    example: 2,
  })
  targetUserId: number;
}
