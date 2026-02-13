import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

export function IsStringOrNull(validationOptions?: ValidationOptions) {
  return function (target: Object, propertyName: string) {
    registerDecorator({
      name: 'isStringOrNull',
      target: target.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any) {
          return value === null || typeof value === 'string';
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be either a string or null`;
        },
      },
    });
  };
}

export class OutfitPathsDto {
  @IsString({ message: 'bird must be a string' })
  @IsNotEmpty({ message: 'bird is required' })
  bird: string;

  @IsStringOrNull()
  hat: string | null;

  @IsStringOrNull()
  accessory: string | null;

  @IsStringOrNull()
  top: string | null;

  @IsStringOrNull()
  bottom: string | null;

  @IsStringOrNull()
  shoes: string | null;

  @IsStringOrNull()
  effect: string | null;
}

export class UpdateRoomOutfitDto {
  @IsObject({ message: 'outfit must be an object' })
  @IsNotEmpty({ message: 'outfit is required' })
  @ValidateNested({ each: false })
  @Type(() => OutfitPathsDto)
  outfit: OutfitPathsDto;
}
