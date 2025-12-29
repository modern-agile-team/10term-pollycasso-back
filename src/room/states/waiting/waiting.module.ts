import { Module } from '@nestjs/common';
import { WaitingService } from './waiting.service';
import { WaitingGateway } from './waiting.gateway';
import { WaitingController } from './waiting.controller';
import { WaitingState } from './waiting.state';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChatModule } from 'src/chat/chat.module';
import { JwtModule } from '@nestjs/jwt';
import { RoomsModule } from 'src/room/room.module';

@Module({
  imports: [
    PrismaModule,
    RoomsModule,
    ChatModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRATION },
    }),
  ],
  controllers: [WaitingController],
  providers: [WaitingService, WaitingGateway, WaitingState],
  exports: [WaitingService, WaitingState],
})
export class WaitingModule {}
