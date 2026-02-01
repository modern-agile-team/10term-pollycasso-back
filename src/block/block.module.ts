import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockRepository } from './block.repository';
import { UsersModule } from 'src/user/user.module';
import { BlockController } from './block.controller';

@Module({
  imports: [UsersModule],
  controllers: [BlockController],
  providers: [BlockService, { provide: 'IBlockRepository', useClass: BlockRepository }],
  exports: [BlockService],
})
export class BlockModule {}
