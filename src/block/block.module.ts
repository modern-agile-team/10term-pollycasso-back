import { forwardRef, Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { UsersModule } from 'src/user/user.module';
import { FriendModule } from 'src/friend/friend.module';

@Module({
  imports: [UsersModule, forwardRef(() => FriendModule)],
  providers: [BlockService, { provide: 'IBlockRepository', useClass: BlockRepository }],
  exports: [BlockService],
})
export class BlockModule {}
