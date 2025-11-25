import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RedisModule } from '../redis/redis.module';
import { TokenModule } from './token/token.module';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [UsersModule, RedisModule, TokenModule],
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
