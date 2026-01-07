import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlayerPageStatus {
  IDLE = 'IDLE',
  SHOPPING = 'SHOPPING',
  CUSTOMIZING = 'CUSTOMIZING',
}

export class UpdateStatusDto {
  @IsEnum(PlayerPageStatus)
  @ApiProperty({
    description: '플레이어 페이지 상태',
    example: PlayerPageStatus.IDLE,
    enum: PlayerPageStatus,
  })
  status: PlayerPageStatus;
}
