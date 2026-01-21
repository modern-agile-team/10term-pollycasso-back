import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import type { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { FriendService } from './friend.service';
import { SendFriendRequestDto } from './dtos/requests/send-friend-request.dto';
import { RespondFriendRequestDto } from './dtos/requests/respond-friend-request.dto';

@UseGuards(AccessTokenGuard)
@Controller('friends')
export class FriendController {
  constructor(private readonly friendService: FriendService) {}

  @Post('request')
  send(@Req() req: AuthenticatedRequest, @Body() dto: SendFriendRequestDto) {
    return this.friendService.sendRequest(req.user.sub, dto.targetUsername);
  }

  @Post('request/:requesterUsername/respond')
  respond(
    @Req() req: AuthenticatedRequest,
    @Param('requesterUsername') requesterUsername: string,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendService.respond(req.user.sub, requesterUsername, dto.accept);
  }

  @Delete('request/:targetUsername')
  cancel(@Req() req: AuthenticatedRequest, @Param('targetUsername') targetUsername: string) {
    return this.friendService.cancelRequest(req.user.sub, targetUsername);
  }

  @Delete(':friendUsername')
  remove(@Req() req: AuthenticatedRequest, @Param('friendUsername') friendUsername: string) {
    return this.friendService.remove(req.user.sub, friendUsername);
  }
}
