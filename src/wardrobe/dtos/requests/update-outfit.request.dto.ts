import {
  IsNotEmpty,
  IsNumber,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

function IsRequiredNumberOrNull(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRequiredNumberOrNull',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _args: ValidationArguments) {
          if (value === undefined) {
            return false;
          }
          return value === null || typeof value === 'number';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be present and be either a number or null`;
        },
      },
    });
  };
}

export class OutfitIdsDto {
  @ApiProperty({
    description: '새(캐릭터) ID',
    example: 150,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  bird: number;

  @ApiProperty({
    description: '모자 ID (필드 필수, 착용 안 할 경우 null)',
    example: 7,
    nullable: true,
    type: Number,
  })
  @IsRequiredNumberOrNull()
  hat: number | null;

  @ApiProperty({
    description: '액세서리 ID (필드 필수, 착용 안 할 경우 null)',
    example: 12,
    nullable: true,
    type: Number,
  })
  @IsRequiredNumberOrNull()
  accessory: number | null;

  @ApiProperty({
    description: '상의 ID (필드 필수, 착용 안 할 경우 null)',
    example: 5,
    nullable: true,
    type: Number,
  })
  @IsRequiredNumberOrNull()
  top: number | null;

  @ApiProperty({
    description: '하의 ID (필드 필수, 착용 안 할 경우 null)',
    example: 8,
    nullable: true,
    type: Number,
  })
  @IsRequiredNumberOrNull()
  bottom: number | null;

  @ApiProperty({
    description: '신발 ID (필드 필수, 착용 안 할 경우 null)',
    example: 3,
    nullable: true,
    type: Number,
  })
  @IsRequiredNumberOrNull()
  shoes: number | null;

  @ApiProperty({
    description: '이펙트 ID (필드 필수, 착용 안 할 경우 null)',
    example: 15,
    nullable: true,
    type: Number,
  })
  @IsRequiredNumberOrNull()
  effect: number | null;
}

export class UpdateOutfitRequestDto {
  @ApiProperty({
    description: '착용할 의상 정보 (모든 7개 필드 필수, 착용 안 할 아이템은 null로 명시)',
    type: OutfitIdsDto,
    example: {
      bird: 150,
      hat: 7,
      accessory: null,
      top: 5,
      bottom: null,
      shoes: 3,
      effect: null,
    },
  })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => OutfitIdsDto)
  outfitIds: OutfitIdsDto;
}
