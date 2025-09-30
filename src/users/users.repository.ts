import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { userData } from 'src/auth/interfaces/user-data.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(where: Prisma.UserWhereUniqueInput): Promise<boolean> {
    const count = await this.prisma.user.count({ where });
    return count > 0;
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<userData> {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        nickname: true,
        provider: true,
        providerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
