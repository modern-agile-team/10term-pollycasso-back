import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KickUserDto {
  @IsInt()
  @ApiProperty({
    description: '강퇴할 플레이어 ID',
    example: 2,
  })
  targetUserId: number;
}
