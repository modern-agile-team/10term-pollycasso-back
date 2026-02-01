import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DrawDataDto } from '../responses/draw-data.dto';

export class SubmitDrawingDto {
  @ValidateNested()
  @Type(() => DrawDataDto)
  drawData!: DrawDataDto;
}
