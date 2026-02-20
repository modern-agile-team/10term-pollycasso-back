import { Module } from '@nestjs/common';
import { UsersService } from './user.service';
import { UsersRepository } from './user.repository';
import { UsersController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
