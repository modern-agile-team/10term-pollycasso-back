export interface JwtPayload {
  sub: number;
  nickname: string;
  tag: string;
  refreshToken?: string;
  iat?: number;
  exp?: number;
}
