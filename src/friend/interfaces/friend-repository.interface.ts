import { FriendStatus } from '@prisma/client';
import { Friend } from '../friend.entity';

export interface IFriendRepository {
  findFriendship(userId: number, targetUserId: number): Promise<Friend | null>;
  create(userId: number, targetUserId: number): Promise<Friend>;
  updateStatus(id: number, status: FriendStatus): Promise<Friend>;
  deleteById(id: number): Promise<void>;
  deleteBidirectional(userId: number, friendId: number): Promise<void>;
}
