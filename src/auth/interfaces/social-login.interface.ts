import { Provider } from '@prisma/client';

export interface SocialLoginPayload {
  provider: Provider;
  providerId: string;
  nickname: string;
  tag?: string;
}
