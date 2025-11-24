import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateKakaoUserDto } from './dto/create-kakao-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // 아이디 또는 닉네임으로 유저 조회
  async findUserByUsernameOrNickname(username: string, nickname: string): Promise<User | null> {
    return this.usersRepository.findByUsernameOrNickname(username, nickname);
  }

  // 비밀번호 확인용 유저 조회
  async findUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneByUsername(username);
  }

  // 유저 생성
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.usersRepository.createUser(userData);
  }

  // 카카오 아이디로 유저 조회
  async findUserByKakaoId(kakaoId: string): Promise<User | null> {
    return this.usersRepository.findOneByKakaoId(kakaoId);
  }

  // 카카오 유저 생성
  async createKakaoUser(userData: CreateKakaoUserDto): Promise<User> {
    return this.usersRepository.createUser(userData);
  }
}
