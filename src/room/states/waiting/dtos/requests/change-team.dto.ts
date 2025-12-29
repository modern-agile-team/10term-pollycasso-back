import { IsEnum } from 'class-validator';
import { Team } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeTeamDto {
  @IsEnum(Team)
  @ApiProperty({
    description: '이동할 팀',
    example: Team.RED,
    enum: Team,
  })
  targetTeam: Team;
}
