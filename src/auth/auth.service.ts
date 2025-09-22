import { ConflictException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { SignupRequestDto } from './dto/requests/signup-request.dto';
import { PasswordEncoderService } from '../common/hashing/password-encoder.service';
import { JwtService } from '@nestjs/jwt';
import { Paylode } from './interfaces/paylode.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly passwordEncoderService: PasswordEncoderService,
    private jwtService: JwtService,
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
  async login(userData: any) {
    const paylode: Paylode = {
      username: userData.username,
      nickname: userData.nickname,
    };
    return {
      access_token: this.jwtService.sign(paylode),
    };
  }
}
