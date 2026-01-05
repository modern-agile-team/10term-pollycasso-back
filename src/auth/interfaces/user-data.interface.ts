export interface UserData {
  id: number;
  username: string | null;
  nickname: string;
  tag: string;
  provider: string | null;
  providerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
