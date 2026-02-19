import { IsInt, IsString, Max, Min, IsNotEmpty } from 'class-validator';

export class SubmitEvaluationDto {
  @IsString()
  @IsNotEmpty()
  drawingId: string;

  @IsInt()
  @Min(0)
  @Max(10)
  score: number;
}
