import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessageDto, ChatReceiveChannel } from './dtos/responses/message-response.dto';

@Injectable()
export class ChatService {
  createMessage(params: {
    senderId?: string;
    nickname?: string;
    message: string;
    channel: ChatReceiveChannel;
  }): ChatMessageDto {
    const baseMessage: ChatMessageDto = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      message: params.message,
      channel: params.channel,
    };

    if (params.channel !== ChatReceiveChannel.SYSTEM && params.senderId && params.nickname) {
      baseMessage.senderId = params.senderId;
      baseMessage.nickname = params.nickname;
    }

    return baseMessage;
  }

  createGlobalMessage(params: {
    senderId: string;
    nickname: string;
    message: string;
  }): ChatMessageDto {
    return this.createMessage({
      ...params,
      channel: ChatReceiveChannel.GLOBAL,
    });
  }

  createSystemMessage(params: { message: string }): ChatMessageDto {
    return this.createMessage({
      message: params.message,
      channel: ChatReceiveChannel.SYSTEM,
    });
  }
}
