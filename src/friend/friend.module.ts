import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendRepository } from './friend.repository';
import { UsersModule } from 'src/user/user.module';
import { BlockModule } from 'src/block/block.module';
import { FriendController } from './friend.controller';
import { RedisModule } from 'src/redis/redis.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [UsersModule, BlockModule, RedisModule, PrismaModule],
  controllers: [FriendController],
  providers: [FriendService, { provide: 'IFriendRepository', useClass: FriendRepository }],
  exports: [FriendService],
})
export class FriendModule {}
