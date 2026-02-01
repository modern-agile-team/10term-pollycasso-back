import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DrawLineDto } from '../requests/send-drawing.dto';

export class DrawDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DrawLineDto)
  lines!: DrawLineDto[];
}
