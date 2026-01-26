import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendRepository } from './friend.repository';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [UsersModule],
  providers: [FriendService, { provide: 'IFriendRepository', useClass: FriendRepository }],
  exports: [FriendService],
})
export class FriendModule {}
