import { Injectable } from '@nestjs/common';
import { WaitingState } from '../../waiting/waiting.state';
import { RANDOM_THEMES } from './constants/topic.constant';

@Injectable()
export class TopicService {
  private readonly recentByRoom = new Map<number, string[]>();

  constructor(private readonly waitingState: WaitingState) {}

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
  pickRandomTheme(roomId: number, recentLimit = 3): string {
    const recent = this.recentByRoom.get(roomId) ?? [];

    const candidates = RANDOM_THEMES.filter((t) => !recent.includes(t));
    const pool = candidates.length > 0 ? candidates : RANDOM_THEMES;

    const idx = Math.floor(Math.random() * pool.length);
    const selected = pool[idx];

    const nextRecent = [selected, ...recent].slice(0, recentLimit);

    this.recentByRoom.set(roomId, nextRecent);

    return selected;
  }

  clearRoomData(roomId: number) {
    this.recentByRoom.delete(roomId);
  }
}
