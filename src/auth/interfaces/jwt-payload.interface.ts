export interface JwtPayload {
  sub: number;
  nickname: string;
  iat?: number;
  exp?: number;
  refreshToken?: string;
}
