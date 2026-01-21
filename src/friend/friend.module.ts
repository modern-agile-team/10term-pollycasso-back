import { Module } from '@nestjs/common';
import { FriendController } from './friend.controller';
import { FriendService } from './friend.service';
import { FriendRepository } from './friend.repository';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [UsersModule],
  controllers: [FriendController],
  providers: [FriendService, { provide: 'IFriendRepository', useClass: FriendRepository }],
  exports: ['IFriendRepository'],
})
export class FriendModule {}
