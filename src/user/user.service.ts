import { ConflictException, Injectable } from '@nestjs/common';
import { UsersRepository } from './user.repository';
import { User } from '@prisma/client';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateSocialUserDto } from './dtos/create-social-user.dto';
import { Provider } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { USER_DOMAIN_ERRORS, USER_ERROR_CODES } from 'src/user/constants/user.constant';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // 로그인 아이디(Username)로 조회
  async findUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneByUsername(username);
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

    throw new ConflictException({
      code: USER_ERROR_CODES.TAG_GENERATION_FAILED,
      errors: [USER_DOMAIN_ERRORS.TAG_GENERATION_FAILED],
    });
  }

  private createRandomTag(): string {
    return String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  }
}
