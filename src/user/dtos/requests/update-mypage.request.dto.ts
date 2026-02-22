import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
  Validate,
  ValidateIf,
} from 'class-validator';
import { KoreanCharLimit } from 'src/common/validators/korean-char-limit.validator';

export class UpdateMypageRequestDto {
  @IsOptional()
  @IsString()
  @Length(2, 20)
  @Matches(/^[가-힣a-zA-Z0-9]+$/)
  @Validate(KoreanCharLimit)
  nickname?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @Max(9999)
  tag?: number;

  @ValidateIf((o: UpdateMypageRequestDto) => !!o.newPassword)
  @IsNotEmpty()
  @IsString()
  currentPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!"#$%&'()*+,\-./:;<=>?@[₩\]^_`{|}~]).+$/)
  newPassword?: string;
}
