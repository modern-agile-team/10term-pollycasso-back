import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { SendFriendRequestDto } from 'src/friend/dtos/requests/send-friend-request.dto';
import { FriendService } from 'src/friend/friend.service';
import { RespondFriendRequestDto } from './dtos/requests/respond-friend-request.dto';
import { ApiFriend } from './friend.swagger';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('friends')
@UseGuards(AccessTokenGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Get()
  @ApiFriend.getFriendRelations()
  async getFriendRelations(@Req() req: { user: JwtPayload }) {
    return await this.friendService.getFriendList(req.user.sub);
  }

  @Post('request')
  @ApiFriend.sendRequest()
  async sendRequest(@Req() req: { user: JwtPayload }, @Body() body: SendFriendRequestDto) {
    return await this.friendService.sendRequest(req.user.sub, body.targetUserId);
  }

  @Post('request/:requesterId/respond')
  @ApiFriend.respondFriendRequest()
  async respondFriendRequest(
    @Req() req: { user: JwtPayload },
    @Param('requesterId', ParseIntPipe) requesterId: number,
    @Body() body: RespondFriendRequestDto,
  ) {
    return await this.friendService.respondFriendRequest(req.user.sub, requesterId, body.accept);
  }

  @Delete('request/:targetUserId')
  @HttpCode(204)
  @ApiFriend.cancelFriendRequest()
  async cancelFriendRequest(
    @Req() req: { user: JwtPayload },
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    await this.friendService.cancelRequest(req.user.sub, targetUserId);
  }

  @Delete(':friendUserId')
  @HttpCode(204)
  @ApiFriend.removeFriend()
  async removeFriend(
    @Req() req: { user: JwtPayload },
    @Param('friendUserId', ParseIntPipe) friendUserId: number,
  ) {
    await this.friendService.removeFriend(req.user.sub, friendUserId);
  }
}
