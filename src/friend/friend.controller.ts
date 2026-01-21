import { Body, Controller, Delete, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import type { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { SendFriendRequestDto } from 'src/friend/dtos/requests/send-friend-request.dto';
import { FriendService } from 'src/friend/friend.service';
import { RespondFriendRequestDto } from './dtos/requests/respond-friend-request.dto';
import { ApiFriend } from './friend.swagger';

@Controller('friends')
@UseGuards(AccessTokenGuard)
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  @ApiFriend.sendRequest()
  async sendRequest(@Req() req: AuthenticatedRequest, @Body() body: SendFriendRequestDto) {
    return await this.friendService.sendRequest(req.user.id, body.targetUsername);
  }

  @Post('request/:requesterUsername/respond')
  @ApiFriend.respondFriendRequest()
  async respondFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('requesterUsername') requesterUsername: string,
    @Body() body: RespondFriendRequestDto,
  ) {
    return await this.friendService.respond(req.user.id, requesterUsername, body.accept);
  }

  @Delete('request/:targetUsername')
  @HttpCode(204)
  @ApiFriend.cancelFriendRequest()
  async cancelFriendRequest(
    @Req() req: AuthenticatedRequest,
    @Param('targetUsername') targetUsername: string,
  ) {
    await this.friendService.cancelRequest(req.user.id, targetUsername);
  }

  @Delete(':friendUsername')
  @HttpCode(204)
  @ApiFriend.removeFriend()
  async removeFriend(
    @Req() req: AuthenticatedRequest,
    @Param('friendUsername') friendUsername: string,
  ) {
    await this.friendService.remove(req.user.id, friendUsername);
  }
}
