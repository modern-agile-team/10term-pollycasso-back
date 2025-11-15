import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ description: '메시지를 보낸 사용자 ID', example: 'testtest1' })
  senderId: string;

  @ApiProperty({ description: '메시지를 보낸 사용자 닉네임', example: 'testtest1' })
  nickname: string;

  @ApiProperty({ description: '메시지 내용', example: '안녕하세요!' })
  message: string;

  @ApiProperty({
    description: '메시지 생성 시각',
    example: '2025-01-20T12:34:56.789Z',
  })
  createdAt: string;
}
