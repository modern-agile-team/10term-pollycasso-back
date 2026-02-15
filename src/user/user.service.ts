import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UsersRepository } from './user.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateSocialUserDto } from './dtos/create-social-user.dto';
import { Provider } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // 로그인 아이디(Username)로 조회
  async findUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneByUsername(username);
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOneById(id);
  }

  // 프로필 정보 포함해서 조회 (로그인용)
  async findOneWithProfile(id: number) {
    return this.usersRepository.findOneWithProfile(id);
  }

  // 유저 생성
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.createUserWithTag(userData);
  }

  // Provider로 소셜 사용자 조회
  async findUserByProvider(provider: Provider, providerId: string): Promise<User | null> {
    return this.usersRepository.findUserByProvider(provider, providerId);
  }

  // 소셜 로그인 유저 생성
  async createSocialUser(userData: CreateSocialUserDto): Promise<User> {
    return this.createUserWithTag(userData);
  }

  private async createUserWithTag(userData: CreateUserDto | CreateSocialUserDto): Promise<User> {
    const MAX_RETRIES = 10;

    for (let retries = 0; retries < MAX_RETRIES; retries++) {
      try {
        const tag = this.createRandomTag();

        return await this.usersRepository.createUser({
          ...userData,
          tag,
        });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException();
  }

  private createRandomTag(): string {
    return String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  }
}
