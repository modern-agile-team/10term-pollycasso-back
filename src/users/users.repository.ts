import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsernameOrNickname(username: string, nickname: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { nickname }],
      },
    });
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async findOneByKakaoId(kakaoId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: 'KAKAO',
          providerId: kakaoId,
        },
      },
    });
  }
}
