import { Provider } from '@prisma/client';

export class CreateSocialUserDto {
  provider: Provider;
  providerId: string;
  nickname: string;
  tag?: string;
}
