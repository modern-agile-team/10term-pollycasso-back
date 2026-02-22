import { forwardRef, Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { UserModule } from 'src/user/user.module';
import { FriendModule } from 'src/friend/friend.module';

@Module({
  imports: [UserModule, forwardRef(() => FriendModule)],
  providers: [BlockService, { provide: 'IBlockRepository', useClass: BlockRepository }],
  exports: [BlockService],
})
export class BlockModule {}
