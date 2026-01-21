import { Controller, Delete, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { BlockService } from './block.service';
import type { AuthenticatedRequest } from 'src/auth/interfaces/authenticated-request.interface';
import { ApiBlock } from './block.swagger';

@Controller('blocks')
@UseGuards(AccessTokenGuard)
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(':targetUsername')
  @HttpCode(201)
  @ApiBlock.block()
  async block(@Req() req: AuthenticatedRequest, @Param('targetUsername') targetUsername: string) {
    return await this.blockService.block(req.user.id, targetUsername);
  }

  @Delete(':targetUsername')
  @HttpCode(204)
  @ApiBlock.unblock()
  async unblock(@Req() req: AuthenticatedRequest, @Param('targetUsername') targetUsername: string) {
    await this.blockService.unblock(req.user.id, targetUsername);
  }
}
