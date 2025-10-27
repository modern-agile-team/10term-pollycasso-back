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
    return 'nickname must be shorter than or equal to 10 Korean characters';
  }
}

export class SignupRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9_-]+$/)
  @Length(5, 20)
  username: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!"#$%&'()*+,\-./:;<=>?@[₩\]^_`{|}~]).{8,20}$/)
  @Length(8, 20)
  password: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 20)
  @Matches(/^[가-힣a-zA-Z0-9]+$/)
  @Validate(KoreanCharLimit)
  nickname: string;
}
