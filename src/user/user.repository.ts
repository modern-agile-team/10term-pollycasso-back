import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Provider, User } from '@prisma/client';
import { DEFAULT_BIRD_ID, DEFAULT_OUTFIT } from 'src/outfit/constants/outfit.constant';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOneById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findOneWithProfile(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        profile: {
          create: { outfit: DEFAULT_OUTFIT },
        },
        cosmeticItems: {
          create: [{ cosmeticItemId: DEFAULT_BIRD_ID }],
        },
      },
    });
  }

  async findUserByProvider(provider: Provider, providerId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { provider_providerId: { provider, providerId } },
    });
  }

  async findByNicknameAndTag(nickname: string, tag: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { nickname_tag: { nickname, tag } },
    });
  }

  async updateUser(id: number, data: Prisma.UserUpdateInput): Promise<void> {
    await this.prisma.user.update({ where: { id }, data });
  }
}
