export class CreateUserDto {
  username: string;
  nickname: string;
  tag?: string;
  hashedPassword: string;
}
