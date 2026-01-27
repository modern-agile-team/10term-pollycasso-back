import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [UsersModule],
  providers: [BlockService, { provide: 'IBlockRepository', useClass: BlockRepository }],
  exports: [BlockService],
})
export class BlockModule {}
