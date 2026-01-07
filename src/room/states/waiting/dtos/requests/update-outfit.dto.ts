import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOutfitDto {
  @IsObject()
  @ApiProperty({
    description: '플레이어 아웃핏 (코디)',
    example: { bird: 'bird_01', hat: 'hat_01', accessory: 'accessory_01' },
  })
  outfit: {
    bird?: string;
    hat?: string;
    accessory?: string;
    [key: string]: string | undefined;
  };
}
