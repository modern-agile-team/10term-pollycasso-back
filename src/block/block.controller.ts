import { Controller, Delete, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { BlockService } from './block.service';
import type { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';

@UseGuards(AccessTokenGuard)
@Controller('blocks')
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(':targetUsername')
  @HttpCode(201)
  block(@Req() req: AuthenticatedRequest, @Param('targetUsername') targetUsername: string) {
    return this.blockService.block(req.user.sub, targetUsername);
  }

  @Delete(':targetUsername')
  @HttpCode(204)
  unblock(@Req() req: AuthenticatedRequest, @Param('targetUsername') targetUsername: string) {
    return this.blockService.unblock(req.user.sub, targetUsername);
  }
}
