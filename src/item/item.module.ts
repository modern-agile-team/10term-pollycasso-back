import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameItemRepository } from './repositories/game-item.repository';
import { UserGameItemRepository } from './repositories/user-game-item.repository';
import { ItemInventoryService } from './services/item-inventory.service';
import { ItemSpecCacheService } from './services/item-spec-cache.service';

@Module({
  providers: [
    PrismaService,
    GameItemRepository,
    UserGameItemRepository,
    ItemInventoryService,
    ItemSpecCacheService,
  ],
  exports: [GameItemRepository, UserGameItemRepository, ItemInventoryService, ItemSpecCacheService],
})
export class ItemModule {}
