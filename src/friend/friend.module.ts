import { forwardRef, Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendRepository } from './friend.repository';
import { UsersModule } from 'src/user/user.module';
import { BlockModule } from 'src/block/block.module';
import { RedisModule } from 'src/redis/redis.module';
import { FriendGateway } from './friend.gateway';
import { PresenceModule } from 'src/presence/presence.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRATION },
    }),
    UsersModule,
    forwardRef(() => BlockModule),
    RedisModule,
    PresenceModule,
  ],
  providers: [
    FriendService,
    FriendGateway,
    { provide: 'IFriendRepository', useClass: FriendRepository },
  ],
  exports: [FriendService, 'IFriendRepository', FriendGateway],
})
export class FriendModule {}
