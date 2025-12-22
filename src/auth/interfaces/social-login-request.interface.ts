import { Request } from 'express';
import { SocialLoginPayload } from './social-login.interface';

export interface SocialLoginRequest extends Request {
  user: SocialLoginPayload;
}
