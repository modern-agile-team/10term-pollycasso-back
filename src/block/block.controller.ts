import {
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { BlockService } from './block.service';
import { ApiBlock } from './block.swagger';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('blocks')
@UseGuards(AccessTokenGuard)
export class BlockController {
  constructor(private readonly blockService: BlockService) {}

  @Post(':targetUserId')
  @HttpCode(201)
  @ApiBlock.block()
  async block(
    @Req() req: { user: JwtPayload },
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    return await this.blockService.block(req.user.sub, targetUserId);
  }

  @Delete(':targetUserId')
  @HttpCode(204)
  @ApiBlock.unblock()
  async unblock(
    @Req() req: { user: JwtPayload },
    @Param('targetUserId', ParseIntPipe) targetUserId: number,
  ) {
    await this.blockService.unblock(req.user.sub, targetUserId);
  }
}
