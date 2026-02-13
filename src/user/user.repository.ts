import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Provider, User } from '@prisma/client';
import { DEFAULT_OUTFIT } from 'src/outfit/outfit.constants';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly DEFAULT_BIRD_ID = 150;

  async findByUsernameOrNickname(username: string, nickname: string): Promise<User | null> {
    return await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { nickname }],
      },
    });
  }

  async findOneById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOneByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findOneWithProfile(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
      },
    });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        profile: {
          create: {
            outfit: DEFAULT_OUTFIT,
          },
        },
        cosmeticItems: {
          create: [
            {
              cosmeticItemId: this.DEFAULT_BIRD_ID,
            },
          ],
        },
      },
      include: {
        profile: true,
        cosmeticItems: true,
      },
    });
  }

  async findUserByProvider(provider: Provider, providerId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });
  }
}
