import { Request } from 'express';
import { userData } from './user-data.interface';

export interface AuthenticatedRequest extends Request {
  user: userData;
}
