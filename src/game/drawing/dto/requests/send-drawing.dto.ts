import { IsArray, IsIn, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { type DrawingTool } from '../../interface/drawing.interface';

export class DrawLineDto {
  @IsIn(['pencil', 'brush', 'neon', 'bucket', 'eraser'])
  tool!: DrawingTool;

  @IsString()
  color!: string;

  @IsNumber()
  size!: number;

  @IsArray()
  @IsNumber({}, { each: true })
  points!: number[];
}

export class SendDrawingDto {
  @ValidateNested()
  @Type(() => DrawLineDto)
  line!: DrawLineDto;
}
