import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class RespondFriendRequestDto {
  @IsBoolean()
  @ApiProperty({
    description: '친구 요청 수락 여부',
    example: true,
  })
  accept: boolean;
}
