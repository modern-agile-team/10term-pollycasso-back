import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: '대상 사용자 태그',
    example: '1234',
  })
  targetTag: string;
}
