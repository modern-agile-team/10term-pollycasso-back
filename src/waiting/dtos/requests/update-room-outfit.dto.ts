import {
  IsString,
  IsNotEmpty,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

function IsRequiredStringOrNull(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRequiredStringOrNull',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === undefined) {
            return false;
          }
          return value === null || typeof value === 'string';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be present and be either a string or null`;
        },
      },
    });
  };
}

export class OutfitPathsDto {
  @ApiProperty({
    description: '새 이미지 경로',
    example: 'bird_01',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  bird: string;

  @ApiProperty({
    description: '모자 이미지 경로 (필드 필수, 착용 안 할 경우 null)',
    example: 'hat_01',
    nullable: true,
    type: String,
  })
  @IsRequiredStringOrNull()
  hat: string | null;

  @ApiProperty({
    description: '액세서리 이미지 경로 (필드 필수, 착용 안 할 경우 null)',
    example: 'accessory_01',
    nullable: true,
    type: String,
  })
  @IsRequiredStringOrNull()
  accessory: string | null;

  @ApiProperty({
    description: '상의 이미지 경로 (필드 필수, 착용 안 할 경우 null)',
    example: 'top_01',
    nullable: true,
    type: String,
  })
  @IsRequiredStringOrNull()
  top: string | null;

  @ApiProperty({
    description: '하의 이미지 경로 (필드 필수, 착용 안 할 경우 null)',
    example: 'bottom_01',
    nullable: true,
    type: String,
  })
  @IsRequiredStringOrNull()
  bottom: string | null;

  @ApiProperty({
    description: '신발 이미지 경로 (필드 필수, 착용 안 할 경우 null)',
    example: 'shoes_01',
    nullable: true,
    type: String,
  })
  @IsRequiredStringOrNull()
  shoes: string | null;

  @ApiProperty({
    description: '이펙트 이미지 경로 (필드 필수, 착용 안 할 경우 null)',
    example: 'effect_01',
    nullable: true,
    type: String,
  })
  @IsRequiredStringOrNull()
  effect: string | null;
}

export class UpdateRoomOutfitRequestDto {
  @ApiProperty({
    description: '착용할 의상 정보 (모든 7개 필드 필수, 착용 안 할 아이템은 null로 명시)',
    type: OutfitPathsDto,
    example: {
      bird: 'bird_01',
      hat: 'hat_01',
      accessory: null,
      top: 'top_01',
      bottom: null,
      shoes: 'shoes_01',
      effect: null,
    },
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => OutfitPathsDto)
  outfit: OutfitPathsDto;
}
