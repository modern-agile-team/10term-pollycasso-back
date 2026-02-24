import { FinalResultItem } from '../types/finished.type';

export interface MatchFinalizeParams {
  matchId: number;
  finalResults: FinalResultItem[];
  roomMemberIdByUserId: Record<string, number>;
}

export interface MatchLifecycleParams extends MatchFinalizeParams {
  roomId: number;
}

export interface RewardsGrantedEventPayload {
  userId: number;
  matchId: number;
  exp: number;
  coin: number;
  placement: number;
}

export interface UpsertMatchResultParams {
  matchId: number;
  roomMemberId: number;
  score: number;
  placement: number;
}

export interface ConfirmRewardParams {
  matchResultId: number;
  exp: number;
  coin: number;
  now?: Date;
}

export interface IncrementUserProfileParams {
  userId: number;
  exp: number;
  coin: number;
}
