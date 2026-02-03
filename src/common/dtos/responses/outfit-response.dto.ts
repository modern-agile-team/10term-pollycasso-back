import { ApiProperty } from '@nestjs/swagger';
import { Outfit } from '../../types/outfit.type';

export class OutfitDto {
  @ApiProperty({ description: '새(캐릭터) ID', example: 'bird_01' })
  bird: string;

  @ApiProperty({ description: '모자 ID', example: 'hat_01', nullable: true })
  hat: string | null;

  @ApiProperty({ description: '액세서리 ID', example: 'acc_01', nullable: true })
  accessory: string | null;

  @ApiProperty({ description: '상의 ID', example: 'top_01', nullable: true })
  top: string | null;

  @ApiProperty({ description: '하의 ID', example: 'bottom_01', nullable: true })
  bottom: string | null;

  @ApiProperty({ description: '신발 ID', example: 'shoes_01', nullable: true })
  shoes: string | null;

  @ApiProperty({ description: '이펙트 ID', example: 'effect_01', nullable: true })
  effect: string | null;

  constructor(outfit: Outfit) {
    this.bird = outfit.bird;
    this.hat = outfit.hat;
    this.accessory = outfit.accessory;
    this.top = outfit.top;
    this.bottom = outfit.bottom;
    this.shoes = outfit.shoes;
    this.effect = outfit.effect;
  }
}
