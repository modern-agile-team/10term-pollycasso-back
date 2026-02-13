import { ApiProperty } from '@nestjs/swagger';
import { OutfitIds } from 'src/outfit/outfit.type';

export class OutfitDto {
  @ApiProperty({ description: '새(캐릭터) ID', example: 1 })
  bird: number;

  @ApiProperty({ description: '모자 ID', example: 7, nullable: true })
  hat: number | null;

  @ApiProperty({ description: '액세서리 ID', example: 12, nullable: true })
  accessory: number | null;

  @ApiProperty({ description: '상의 ID', example: 5, nullable: true })
  top: number | null;

  @ApiProperty({ description: '하의 ID', nullable: true })
  bottom: number | null;

  @ApiProperty({ description: '신발 ID', nullable: true })
  shoes: number | null;

  @ApiProperty({ description: '이펙트 ID', nullable: true })
  effect: number | null;

  constructor(outfit: OutfitIds) {
    this.bird = outfit.bird;
    this.hat = outfit.hat;
    this.accessory = outfit.accessory;
    this.top = outfit.top;
    this.bottom = outfit.bottom;
    this.shoes = outfit.shoes;
    this.effect = outfit.effect;
  }
}
