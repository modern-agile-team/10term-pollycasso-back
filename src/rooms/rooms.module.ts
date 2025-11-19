import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { RoomsGateway } from './rooms.gateway';

@Module({
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsGateway,
    { provide: 'IRoomsRepository', useClass: RoomsRepository },
  ],
})
export class RoomsModule {}
