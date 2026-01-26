import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessageDto, ChatReceiveChannel } from './dtos/responses/message-response.dto';
import { ChatValidationService } from './chat-validation.service';

@Injectable()
export class ChatService {
  constructor(private readonly chatValidationService: ChatValidationService) {}

  private createMessage(params: {
    senderId?: string;
    nickname?: string;
    message: string;
    channel: ChatReceiveChannel;
    targetId?: string;
    targetNickname?: string;
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

    if (params.channel === ChatReceiveChannel.DIRECT && params.targetId && params.targetNickname) {
      baseMessage.targetId = params.targetId;
      baseMessage.targetNickname = params.targetNickname;
    }

    return baseMessage;
  }

  createGlobalMessage(params: {
    senderId: string;
    nickname: string;
    message: string;
  }): ChatMessageDto {
    return this.createMessage({ ...params, channel: ChatReceiveChannel.GLOBAL });
  }

  createDirectMessage(params: {
    senderId: string;
    nickname: string;
    message: string;
    targetId: string;
    targetNickname: string;
  }): ChatMessageDto {
    return this.createMessage({ ...params, channel: ChatReceiveChannel.DIRECT });
  }

  createSystemMessage(params: { message: string }): ChatMessageDto {
    return this.createMessage({ message: params.message, channel: ChatReceiveChannel.SYSTEM });
  }

  handleGlobalMessage(params: {
    senderId: string;
    senderNickname: string;
    message: string;
  }): ChatMessageDto {
    return this.createGlobalMessage({
      senderId: params.senderId,
      nickname: params.senderNickname,
      message: params.message,
    });
  }

  async handleDirectMessage(params: {
    senderId: number;
    senderNickname: string;
    targetId: number;
    message: string;
  }): Promise<ChatMessageDto> {
    const validatedTarget = await this.chatValidationService.validateDirectMessage(
      params.senderId,
      params.targetId,
    );

    return this.createDirectMessage({
      senderId: params.senderId.toString(),
      nickname: params.senderNickname,
      message: params.message,
      targetId: params.targetId.toString(),
      targetNickname: validatedTarget.nickname,
    });
  }

  handleSystemMessage(message: string): ChatMessageDto {
    return this.createSystemMessage({ message });
  }
}
