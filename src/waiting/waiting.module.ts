import { Module } from '@nestjs/common';
import { WaitingService } from './waiting.service';
import { WaitingGateway } from './waiting.gateway';
import { WaitingController } from './waiting.controller';
import { WaitingStore } from './waiting.store';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChatModule } from 'src/chat/chat.module';
import { JwtModule } from '@nestjs/jwt';
import { RoomsModule } from 'src/room/room.module';
import { GameStateModule } from 'src/game-state/game-state.module';

@Module({
  imports: [
    PrismaModule,
    RoomsModule,
    ChatModule,
    GameStateModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRATION },
    }),
  ],
  controllers: [WaitingController],
  providers: [WaitingService, WaitingGateway, WaitingStore],
  exports: [WaitingService, WaitingStore],
})
export class WaitingModule {}
