import { Module } from '@nestjs/common';
import { RoomsModule } from './room/room.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatModule } from './chat/chat.module';
import { GameModule } from './game/game.module';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './config/winston.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WaitingModule } from './waiting/waiting.module';
import { GameStateModule } from './game-state/game-state.module';
import { FriendModule } from './friend/friend.module';
import { BlockModule } from './block/block.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ShopModule } from './shop/shop.module';
import { ItemModule } from './item/item.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => winstonConfig(configService),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RoomsModule,
    WaitingModule,
    ChatModule,
    GameStateModule,
    GameModule,
    FriendModule,
    BlockModule,
    ShopModule,
    ItemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
