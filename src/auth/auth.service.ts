import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { PasswordEncoderService } from '../common/hashing/password-encoder.service';
import { JwtPaylode } from './interfaces/jwt-paylode.interface';
import { TokenService } from './token/token.service';
import { RedisService } from './redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { userData } from './interfaces/user-data.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly passwordEncoderService: PasswordEncoderService,
    private readonly tokenService: TokenService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  // 회원가입
  async signup(signupRequestDto: SignupRequestDto): Promise<void> {
    const existsUsername = await this.userService.getUserByUsername(signupRequestDto.username);
    if (existsUsername) {
      throw new ConflictException('이미 사용 중인 아이디입니다.');
    }
    const existsNickname = await this.userService.getUserByNickname(signupRequestDto.nickname);
    if (existsNickname) {
      throw new ConflictException('이미 사용 중인 닉네임입니다.');
    }

    const hashedPassword = await this.passwordEncoderService.hash(signupRequestDto.password);

    await this.userService.createUser({
      username: signupRequestDto.username,
      nickname: signupRequestDto.nickname,
      hashedPassword,
    });
  }

  // 유저 검증
  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userService.getUserByUsername(username);
    if (!user || !user.hashedPassword) return null;

    const isMatch = await this.passwordEncoderService.compare(password, user.hashedPassword);
    if (!isMatch) return null;

    const { hashedPassword, ...result } = user;
    return result;
  }

  // 로그인
  async login(userData: userData) {
    const paylode: JwtPaylode = {
      sub: userData.sub,
      nickname: userData.nickname,
    };
    const accessToken = this.tokenService.createAccessToken(paylode);
    const refreshToken = this.tokenService.createRefreshToken(paylode);

    const key = `refresh:${paylode.sub}`;
    const ttl = parseInt(this.configService.getOrThrow<string>('REDIS_TTL'));

    await this.redisService.set(key, refreshToken, ttl);

    return {
      accessToken,
      refreshToken,
    };
  }

  // accessToken 재발급
  async refreshToken(userData: userData) {
    const paylode: JwtPaylode = {
      sub: userData.sub,
      nickname: userData.nickname,
    };
    const accessToken = this.tokenService.createAccessToken(paylode);
    return accessToken;
  }

  // 로그아웃
  async logout(userData: JwtPaylode) {
    console.log(userData);
    const key = `refresh:${userData.sub}`;
    await this.redisService.del(key);
  }
}
