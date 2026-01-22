import { Body, Controller, Delete, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post('request')
  @ApiFriend.sendRequest()
  async sendRequest(@Req() req: { user: JwtPayload }, @Body() body: SendFriendRequestDto) {
    return await this.friendService.sendRequest(req.user.sub, body.targetTag);
  }

  @Post('request/:requesterTag/respond')
  @ApiFriend.respondFriendRequest()
  async respondFriendRequest(
    @Req() req: { user: JwtPayload },
    @Param('requesterTag') requesterTag: string,
    @Body() body: RespondFriendRequestDto,
  ) {
    return await this.friendService.respond(req.user.sub, requesterTag, body.accept);
  }

  @Delete('request/:targetTag')
  @HttpCode(204)
  @ApiFriend.cancelFriendRequest()
  async cancelFriendRequest(
    @Req() req: { user: JwtPayload },
    @Param('targetTag') targetTag: string,
  ) {
    await this.friendService.cancelRequest(req.user.sub, targetTag);
  }

  @Delete(':friendTag')
  @HttpCode(204)
  @ApiFriend.removeFriend()
  async removeFriend(@Req() req: { user: JwtPayload }, @Param('friendTag') friendTag: string) {
    await this.friendService.remove(req.user.sub, friendTag);
  }
}
