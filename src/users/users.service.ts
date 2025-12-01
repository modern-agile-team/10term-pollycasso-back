import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateSocialUserDto } from './dto/create-social-user.dto';
import { Provider } from '@prisma/client';

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

  // 소셜 로그인 유저ID 조회
  async findUserByProvider(provider: Provider, providerId: string): Promise<User | null> {
    return this.usersRepository.findUserByProvider(provider, providerId);
  }

  // 소셜 로그인 유저 조회
  async findSocialUser(nickname: string): Promise<User | null> {
    return this.usersRepository.findByNickname(nickname);
  }

  // 소셜 로그인 유저 생성
  async createSocialUser(userData: CreateSocialUserDto): Promise<User> {
    return this.usersRepository.createUser(userData);
  }
}
