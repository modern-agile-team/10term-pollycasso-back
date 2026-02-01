import { Block } from '../block.entity';

export interface IBlockRepository {
  findBlockRelation(blockerId: number, blockedId: number): Promise<Block | null>;
  findBlockedUsersByBlocker(blockerId: number): Promise<{ blockedId: number }[]>;
  findBlockersByBlocked(blockedId: number): Promise<{ blockerId: number }[]>;
  createBlockRelation(blockerId: number, blockedId: number): Promise<Block>;
  deleteBlockRelation(blockerId: number, blockedId: number): Promise<void>;
}
