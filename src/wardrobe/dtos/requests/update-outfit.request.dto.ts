import {
  IsNotEmpty,
  IsNumber,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export function IsNumberOrNull(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: 'isNumberOrNull',
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return value === null || typeof value === 'number';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be either a number or null`;
        },
      },
    });
  };
}

export class OutfitIdsDto {
  @IsNumber()
  @IsNotEmpty({ message: 'bird is required' })
  bird: number;

  @IsNumberOrNull()
  hat: number | null;

  @IsNumberOrNull()
  accessory: number | null;

  @IsNumberOrNull()
  top: number | null;

  @IsNumberOrNull()
  bottom: number | null;

  @IsNumberOrNull()
  shoes: number | null;

  @IsNumberOrNull()
  effect: number | null;
}

export class UpdateOutfitRequestDto {
  @IsObject({ message: 'outfitIds must be an object' })
  @IsNotEmpty({ message: 'outfitIds is required' })
  @ValidateNested({ each: false })
  @Type(() => OutfitIdsDto)
  outfitIds: OutfitIdsDto;
}
