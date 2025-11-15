import { Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { MessageResponseDto } from './dtos/responses/message-response.dto';

@Injectable()
export class ChatService {
  private sanitize(message: string): string {
    return sanitizeHtml(message, {
      allowedTags: [],
      allowedAttributes: {},
    }).trim();
  }

  createLobbyMessage(params: {
    senderId: string;
    nickname: string;
    message: string;
  }): MessageResponseDto {
    const cleanMessage = this.sanitize(params.message);

    return {
      senderId: params.senderId,
      nickname: params.nickname,
      message: cleanMessage,
      createdAt: new Date().toISOString(),
    };
  }
}
