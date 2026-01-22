import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SendFriendRequestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @ApiProperty({
    description: '대상 사용자 ID',
    example: 1,
  })
  targetUserId: number;
}
