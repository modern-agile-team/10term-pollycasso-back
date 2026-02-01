import { FriendStatus } from '@prisma/client';

export interface FriendshipData {
  id: number;
  requesterId: number;
  receiverId: number;
  status: FriendStatus;
  createdAt: Date;
}

export interface UserProfile {
  id: number;
  nickname: string;
  profile: {
    outfit: unknown;
    level: number;
  } | null;
}
