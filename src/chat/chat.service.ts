import { Injectable } from '@nestjs/common';
import { MessageResponseDto } from './dtos/responses/message-response.dto';

@Injectable()
export class ChatService {
  createLobbyMessage(params: {
    senderId: string;
    nickname: string;
    message: string;
  }): MessageResponseDto {
    return {
      senderId: params.senderId,
      nickname: params.nickname,
      message: params.message,
      createdAt: new Date().toISOString(),
    };
  }
}
