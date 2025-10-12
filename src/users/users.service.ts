import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { Prisma, User } from '@prisma/client';
import { userData } from 'src/auth/interfaces/user-data.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  // 검증용
  async checkUserExists(where: Prisma.UserWhereUniqueInput): Promise<boolean> {
    return this.usersRepository.exists(where);
  }

  // 비밀번호 확인용 유저 조회
  async findUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneByUsername(username);
  }

  // 유저 생성
  async createUser(userData: Prisma.UserCreateInput): Promise<userData> {
    return this.usersRepository.createUser(userData);
  }
}
