import { Injectable } from '@nestjs/common';
import { JwtPaylode } from '../interfaces/jwt-paylode.interface';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  createAccessToken(paylode: JwtPaylode) {
    return this.jwtService.sign(paylode, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_EXPIRATION'),
    });
  }

  createRefreshToken(paylode: JwtPaylode) {
    return this.jwtService.sign(paylode, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_EXPIRATION'),
    });
  }
}
