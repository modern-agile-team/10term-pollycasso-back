import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { WaitingService } from './waiting.service';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ApiWaiting } from './waiting.swagger';

@Controller('rooms')
@UseGuards(AccessTokenGuard)
export class WaitingController {
  constructor(private readonly waitingService: WaitingService) {}

  @Get(':roomId/waiting')
  @ApiWaiting.getRoomState()
  async getRoomState(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.waitingService.getState(roomId);
  }
}
