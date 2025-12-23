import { Injectable } from '@nestjs/common';
import { UsersRepository } from './user.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateSocialUserDto } from './dto/create-social-user.dto';
import { Provider } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // 로그인 아이디(Username)로 조회
  async findUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneByUsername(username);
  }

  // 유저 생성
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.usersRepository.createUser(userData);
  }

  // Provider로 소셜 사용자 조회
  async findUserByProvider(provider: Provider, providerId: string): Promise<User | null> {
    return this.usersRepository.findUserByProvider(provider, providerId);
  }

  // 소셜 로그인 유저 생성
  async createSocialUser(userData: CreateSocialUserDto): Promise<User> {
    return this.usersRepository.createUser(userData);
  }
}
