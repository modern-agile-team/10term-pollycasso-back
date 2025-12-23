import { Module } from '@nestjs/common';
import { UsersService } from './user.service';
import { UsersRepository } from './user.repository';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
