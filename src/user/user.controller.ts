import { Body, Controller, Get, Patch, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { UserService } from './user.service';
import { UpdateMypageRequestDto } from './dtos/requests/update-mypage.request.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { ProfileResponseDto } from './dtos/responses/profile-response.dto';

@Controller('users')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getMyProfile(@CurrentUser() user: JwtPayload): Promise<ProfileResponseDto> {
    return this.userService.getMyProfile(user.sub);
  }

  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMypage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateMypageRequestDto,
  ): Promise<void> {
    await this.userService.updateMypage(user.sub, dto);
  }
}
