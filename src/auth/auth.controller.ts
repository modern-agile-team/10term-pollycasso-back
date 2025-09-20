import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async create(@Body() data: SignupRequestDto) {
    await this.authService.signup(data);
    return {
      message: '회원가입성공',
      statusCode: 201,
    };
  }
}
