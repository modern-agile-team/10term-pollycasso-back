import { Injectable } from '@nestjs/common';
import { RANDOM_THEMES } from './constants/topic.constant';
import { WaitingStore } from 'src/waiting/waiting.store';

@Injectable()
export class TopicService {
  constructor(private readonly waitingState: WaitingStore) {}

  // 랜덤 주제자 선정
  async buildThemeSelectionContext(roomId: number) {
    const players = await this.waitingState.getPlayers(roomId);
    if (!players.length) return null;

    const selector = players[Math.floor(Math.random() * players.length)];

    return {
      selectorId: selector.userId,
      selectorNickname: selector.nickname,
    };
  }

  // 랜덤 주제 가져오기
  getAllThemes(): string[] {
    return RANDOM_THEMES;
  }
}
