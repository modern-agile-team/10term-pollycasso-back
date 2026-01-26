import { Module } from '@nestjs/common';
import { FriendModule } from 'src/friend/friend.module';
import { BlockController } from './block.controller';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [FriendModule, UsersModule],
  controllers: [BlockController],
  providers: [BlockService, { provide: 'IBlockRepository', useClass: BlockRepository }],
})
export class BlockModule {}
