import { Request } from 'express';
import { UserData } from './user-data.interface';

export interface AuthenticatedRequest extends Request {
  user: UserData;
}
