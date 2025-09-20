import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'KoreanCharLimit', async: false })
export class KoreanCharLimit implements ValidatorConstraintInterface {
  validate(value: string) {
    const korean = value.match(/[가-힣]/g) || [];
    return korean.length <= 10;
  }
  defaultMessage() {
    return '닉네임 한글은 최대 10자까지 허용됩니다.';
  }
}

export class SignupRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'username은 필수입니다.' })
  @Matches(/^[a-z0-9_-]+$/, {
    message: '아이디는 소문자, 숫자, _, - 만 허용됩니다.',
  })
  @Length(5, 20, {
    message: '아이디는 5자 이상, 20자 이하로 입력해야 합니다.',
  })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'password는 필수입니다.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+{}\[\]:;"'<>,.?/\\|]).+$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다.',
  })
  @Length(8, 20, {
    message: '비밀번호는 8자 이상, 20자 이하로 입력해야 합니다.',
  })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'nickname은 필수입니다.' })
  @Length(2, 20, { message: '닉네임은 2자 이상 20자 이하로 입력해주세요.' })
  @Matches(/^[가-힣a-zA-Z0-9]+$/, {
    message: '닉네임은 한글, 영어, 숫자만 사용가능합니다.',
  })
  @Validate(KoreanCharLimit)
  nickname: string;
}
