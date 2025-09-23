import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomsRepository } from './rooms.repository';
import { PasswordEncoderService } from 'src/common/hashing/password-encoder.service';

@Module({
  controllers: [RoomsController],
  providers: [RoomsService, RoomsRepository, PasswordEncoderService],
})
export class RoomsModule {}
