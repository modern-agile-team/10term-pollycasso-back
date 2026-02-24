import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { RewardsGrantedEvent } from './interfaces/finishde.interface';
import { FinishedGateway } from './finished.gateway';
import { FINISHED_EVENTS } from './constants/finished.constant';

@Injectable()
export class FinishedEventsListener {
  constructor(private readonly socket: FinishedGateway) {}

  @OnEvent(FINISHED_EVENTS.REWARDS_GRANTED)
  onRewardsGranted(event: RewardsGrantedEvent) {
    this.socket.unicastRewards(event.userId, {
      matchId: event.matchId,
      exp: event.exp,
      coin: event.coin,
      placement: event.placement,
    });
  }
}
