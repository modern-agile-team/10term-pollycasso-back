import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JwtModule } from '@nestjs/jwt';
import { ChatValidationService } from './chat-validation.service';
import { FriendModule } from 'src/friend/friend.module';
import { BlockModule } from 'src/block/block.module';
import { UsersModule } from 'src/user/user.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: process.env.JWT_ACCESS_EXPIRATION },
    }),
    FriendModule,
    BlockModule,
    UsersModule,
  ],
  providers: [ChatService, ChatValidationService, ChatGateway],
  exports: [ChatService, ChatValidationService],
})
export class ChatModule {}
