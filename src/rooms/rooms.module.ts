import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, { provide: 'IRoomsRepository', useClass: RoomsRepository }],
})
export class RoomsModule {}
