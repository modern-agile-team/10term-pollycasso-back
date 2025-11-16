import { IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export class SendMessageDto {
  @ApiProperty({
    description: '채팅 메시지 (1~50자)',
    example: '안녕하세요!',
    minLength: 1,
    maxLength: 50,
  })
  @Transform(({ value }) =>
    sanitizeHtml(String(value), {
      allowedTags: [],
      allowedAttributes: {},
    }).trim(),
  )
  @MinLength(1)
  @MaxLength(50)
  @IsString()
  @IsNotEmpty()
  message: string;
}
