import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findByUsername(username);
  }

  async getUserByNickname(nickname: string): Promise<User | null> {
    return this.usersRepository.findByNickname(nickname);
  }

  async createUser(userData: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.createUser(userData);
  }
}
