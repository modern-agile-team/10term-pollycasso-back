import { FriendStatus } from '@prisma/client';

export interface Friend {
  id: number;
  requesterId: number;
  receiverId: number;
  status: FriendStatus;
  createdAt: Date;
}
