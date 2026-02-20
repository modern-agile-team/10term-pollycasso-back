import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UsersRepository } from './user.repository';
import { User, Provider } from '@prisma/client';
import { CreateUserDto } from './dtos/requests/create-user.request.dto';
import { CreateSocialUserDto } from './dtos/requests/create-social-user.request.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PasswordEncoderUtil } from 'src/common/utils/password-encoder.util';
import { USER_DOMAIN_ERRORS, USER_ERROR_CODES } from './constants/user.constant';
import { UpdateMypageRequestDto } from './dtos/requests/update-mypage.request.dto';

@Injectable()
export class UsersService {
  private readonly MAX_TAG_RETRIES = 10;

  constructor(private readonly usersRepository: UsersRepository) {}

  async findUserByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOneByUsername(username);
  }

  async findOneById(id: number): Promise<User | null> {
    return this.usersRepository.findOneById(id);
  }

  async findOneWithProfile(id: number) {
    return this.usersRepository.findOneWithProfile(id);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    return this.createUserWithTag(userData);
  }

  async findUserByProvider(provider: Provider, providerId: string): Promise<User | null> {
    return this.usersRepository.findUserByProvider(provider, providerId);
  }

  async createSocialUser(userData: CreateSocialUserDto): Promise<User> {
    return this.createUserWithTag(userData);
  }

  async updateMypage(userId: number, dto: UpdateMypageRequestDto): Promise<void> {
    const formattedTag = dto.tag !== undefined ? String(dto.tag).padStart(4, '0') : undefined;

    if (!dto.nickname && !formattedTag && !dto.newPassword) {
      return;
    }

    const user = await this.usersRepository.findOneById(userId);
    if (!user) {
      throw new NotFoundException();
    }

    if (dto.newPassword) {
      if (user.provider) {
        throw new UnprocessableEntityException({
          code: USER_ERROR_CODES.SOCIAL_USER_NO_PASSWORD,
          errors: [USER_DOMAIN_ERRORS.SOCIAL_USER_NO_PASSWORD],
        });
      }

      const isMatch = await PasswordEncoderUtil.compare(dto.currentPassword!, user.hashedPassword!);
      if (!isMatch) {
        throw new ForbiddenException({
          code: USER_ERROR_CODES.WRONG_PASSWORD,
          errors: [USER_DOMAIN_ERRORS.WRONG_PASSWORD],
        });
      }
    }

    if (dto.nickname || formattedTag) {
      const nickname = dto.nickname ?? user.nickname;
      const tag = formattedTag ?? user.tag;

      const isDuplicate = await this.usersRepository.existsByNicknameAndTag(nickname, tag, userId);
      if (isDuplicate) {
        throw new ConflictException({
          code: USER_ERROR_CODES.DUPLICATE_IDENTITY,
          errors: [USER_DOMAIN_ERRORS.DUPLICATE_IDENTITY],
        });
      }
    }

    const hashedPassword = dto.newPassword
      ? await PasswordEncoderUtil.hash(dto.newPassword)
      : undefined;

    await this.usersRepository.updateUser(userId, {
      nickname: dto.nickname,
      tag: formattedTag,
      hashedPassword,
    });
  }

  private async createUserWithTag(userData: CreateUserDto | CreateSocialUserDto): Promise<User> {
    for (let attempt = 0; attempt < this.MAX_TAG_RETRIES; attempt++) {
      try {
        const tag = this.generateRandomTag();
        return await this.usersRepository.createUser({ ...userData, tag });
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException({
      code: USER_ERROR_CODES.TAG_GENERATION_FAILED,
      errors: [USER_DOMAIN_ERRORS.TAG_GENERATION_FAILED],
    });
  }

  private generateRandomTag(): string {
    return String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  }
}
