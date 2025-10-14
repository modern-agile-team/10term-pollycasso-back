import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

export interface RefreshAuthRequest extends Request {
  user: JwtPayload;
}
