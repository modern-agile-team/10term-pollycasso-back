import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint({ name: 'KoreanCharLimit', async: false })
export class KoreanCharLimit implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return true;
    const korean = value.match(/[가-힣]/g) || [];
    return korean.length <= 10;
  }

  defaultMessage() {
    return 'nickname must be shorter than or equal to 10 Korean characters';
  }
}
