import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { PasswordEncoderService } from '../common/hashing/password-encoder.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenService } from './token/token.service';
import { RedisService } from '../redis/redis.service';
import { userData } from './interfaces/user-data.interface';
import { TokenDto } from './dto/responses/token.dto';
import { AccessTokenDto } from './dto/responses/access-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly passwordEncoderService: PasswordEncoderService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
  ) {}

  // 회원가입
  async signup(signupRequestDto: SignupRequestDto): Promise<TokenDto> {
    const existsUsername = await this.userService.checkUserExists({
      username: signupRequestDto.username,
    });
    if (existsUsername) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }
    const existsNickname = await this.userService.checkUserExists({
      nickname: signupRequestDto.nickname,
    });
    if (existsNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    const hashedPassword = await this.passwordEncoderService.hash(signupRequestDto.password);

    const newUser = await this.userService.createUser({
      username: signupRequestDto.username,
      nickname: signupRequestDto.nickname,
      hashedPassword,
    });

    return this.login(newUser);
  }

  // 유저 검증
  async validateUser(username: string, password: string): Promise<userData | null> {
    const user = await this.userService.findUserByUsername(username);
    if (!user || !user.hashedPassword) return null;

    const isMatch = await this.passwordEncoderService.compare(password, user.hashedPassword);
    if (!isMatch) return null;

    const { hashedPassword: _, ...result } = user;
    return result;
  }

  // 로그인
  async login(userData: userData): Promise<TokenDto> {
    const payload: JwtPayload = {
      sub: userData.id,
      nickname: userData.nickname,
    };
    const accessToken = this.tokenService.createAccessToken(payload);
    const refreshToken = await this.tokenService.createRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }

  // accessToken 재발급
  refreshAccessOnly(userData: JwtPayload): AccessTokenDto {
    return this.tokenService.refreshAccessOnly(userData);
  }

  // 로그아웃
  async logout(userData: JwtPayload) {
    await this.tokenService.revokeToken(userData.sub);
  }
}
