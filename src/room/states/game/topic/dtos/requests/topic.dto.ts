import { IsString, Length } from 'class-validator';

export class TopicDto {
  @IsString()
  @Length(1, 50)
  'value': string;
}
