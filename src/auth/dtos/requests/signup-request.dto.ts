import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, Validate } from 'class-validator';
import { KoreanCharLimit } from 'src/common/validators/korean-char-limit.validator';

export class SignupRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(5, 20)
  @Matches(/^[a-z0-9_-]+$/)
  @ApiProperty({
    description: '영문 소문자, 숫자, 밑줄(_), 하이픈(-)만 사용 가능',
    minLength: 5,
    maxLength: 20,
    pattern: '^[a-z0-9_-]+$',
    example: 'testtest1',
  })
  username: string;

  @IsString()
  @IsNotEmpty()
  @Length(8, 20)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!"#$%&'()*+,\-./:;<=>?@[₩\]^_`{|}~]).+$/)
  @ApiProperty({
    description:
      '8~20자 영문 대소문자, 숫자, 특수문자(!"#$%&\'()*+,-./:;<=>?@[₩]^_`{|}~)를 각각 최소 1개 이상 포함해야 합니다.',
    minLength: 8,
    maxLength: 20,
    example: 'testtest1@',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 20)
  @Matches(/^[가-힣a-zA-Z0-9]+$/)
  @Validate(KoreanCharLimit)
  @ApiProperty({
    description: '한글, 영문 대소문자, 숫자만 사용 가능. 한글은 최대 10자까지 가능합니다.',
    minLength: 2,
    maxLength: 20,
    pattern: '^[가-힣a-zA-Z0-9]+$',
    example: 'testtest1',
  })
  nickname: string;
}
