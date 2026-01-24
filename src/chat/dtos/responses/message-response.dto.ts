export enum ChatReceiveChannel {
  GLOBAL = 'global',
  DIRECT = 'direct',
  SYSTEM = 'system',
}

export class ChatMessageDto {
  id: string;
  createdAt: string;
  message: string;
  channel: ChatReceiveChannel;

  senderId?: string;
  nickname?: string;

  targetId?: string;
  targetNickname?: string;
}
