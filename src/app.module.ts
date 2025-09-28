import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoomsModule } from './rooms/rooms.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [RoomsModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
