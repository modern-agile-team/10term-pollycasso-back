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
<<<<<<< HEAD
import { ShopModule } from './shop/shop.module';
=======
import { ItemModule } from './item/item.module';
>>>>>>> d68f187b002f204f6df18964a40cb085db3cb0b8

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
<<<<<<< HEAD
    ShopModule,
=======
    ItemModule,
>>>>>>> d68f187b002f204f6df18964a40cb085db3cb0b8
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
