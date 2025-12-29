import { Module } from '@nestjs/common';
import { RoomsService } from './room.service';
import { RoomsController } from './room.controller';
import { RoomsRepository } from './room.repository';
import { RoomsGateway } from './room.gateway';

@Module({
  controllers: [RoomsController],
  providers: [
    RoomsService,
    RoomsGateway,
    { provide: 'IRoomsRepository', useClass: RoomsRepository },
    { provide: 'IRoomsEventPublisher', useExisting: RoomsGateway },
  ],
})
export class RoomsModule {}
