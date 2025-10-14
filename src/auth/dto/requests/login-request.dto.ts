import { IsNotEmpty, IsString } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'username은 필수입니다.' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'password는 필수입니다.' })
  password: string;
}
