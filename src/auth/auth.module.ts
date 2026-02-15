import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/user/user.module';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RedisModule } from '../redis/redis.module';
import { TokenModule } from './tokens/token.module';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FriendModule } from 'src/friend/friend.module';
import { PresenceModule } from 'src/presence/presence.module';
import { OutfitModule } from 'src/outfit/outfit.module';

@Module({
  imports: [
    UsersModule,
    RedisModule,
    TokenModule,
    FriendModule,
    forwardRef(() => PresenceModule),
    OutfitModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    KakaoStrategy,
    GoogleStrategy,
  ],
})
export class AuthModule {}
