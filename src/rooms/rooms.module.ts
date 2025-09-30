import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';
import { PaginationModule } from 'src/common/pagination/pagination.module';

@Module({
  imports: [PaginationModule],
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository, PasswordEncoderService],
})
export class RoomsModule {}
