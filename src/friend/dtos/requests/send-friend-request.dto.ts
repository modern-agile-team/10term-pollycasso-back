import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: '대상 사용자명',
    example: 'user1111',
  })
  targetUsername: string;
}
