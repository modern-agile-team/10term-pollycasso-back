export interface IEvaluationVote {
  upsertVoteByDrawingKey(params: {
    matchId: number;
    round: number;
    roomMemberId: number;
    voterId: number;
    rating: number;
  }): Promise<void>;

  countVotesByVoter(params: { matchId: number; round: number; voterId: number }): Promise<number>;

  sumRatingsByDrawingKey(params: {
    matchId: number;
    round: number;
  }): Promise<Record<string, number>>;

  countDistinctTargetsByVoter(params: {
    matchId: number;
    round: number;
    voterId: number;
  }): Promise<number>;
}

export const EVALUATION_VOTE = Symbol('EVALUATION_VOTE');
