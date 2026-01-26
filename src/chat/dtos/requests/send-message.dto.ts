import {
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsEnum,
  ValidateIf,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

export enum ChatSendChannel {
  GLOBAL = 'global',
  DIRECT = 'direct',
}

export class SendMessageDto {
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

  @IsEnum(ChatSendChannel)
  @IsNotEmpty()
  channel: ChatSendChannel;

  @ValidateIf((o: SendMessageDto) => o.channel === ChatSendChannel.DIRECT)
  @IsNotEmpty()
  @IsNumber()
  targetId?: number;
}
