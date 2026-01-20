import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NudgeUserDto {
  @IsInt()
  @Min(1)
  @ApiProperty({
    description: '재촉할 플레이어 ID',
    example: 2,
  })
  targetUserId: number;
}
