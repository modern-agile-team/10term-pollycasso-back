import { Block } from '../block.entity';

export interface IBlockRepository {
  find(userId: number, targetUserId: number): Promise<Block | null>;
  create(userId: number, targetUserId: number): Promise<Block>;
  delete(userId: number, targetUserId: number): Promise<void>;
}
