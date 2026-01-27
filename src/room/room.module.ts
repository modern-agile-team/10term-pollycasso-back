import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { RoomRepository } from './room.repository';
import { RoomGateway } from './room.gateway';

@Module({
  controllers: [RoomController],
  providers: [
    RoomService,
    RoomGateway,
    { provide: 'IRoomRepository', useClass: RoomRepository },
    { provide: 'IRoomEventPublisher', useExisting: RoomGateway },
    { provide: 'IRoomReader', useExisting: RoomService },
    { provide: 'IRoomWriter', useExisting: RoomService },
  ],
  exports: ['IRoomReader', 'IRoomWriter'],
})
export class RoomsModule {}
