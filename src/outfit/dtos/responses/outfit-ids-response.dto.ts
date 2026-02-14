import { ApiProperty } from '@nestjs/swagger';
import { OutfitIds } from 'src/outfit/outfit.type';

export class OutfitIdsResponseDto {
  @ApiProperty({
    description: '새(캐릭터) ID',
    example: 150,
  })
  bird: number;

  @ApiProperty({
    description: '모자 ID',
    example: 7,
    nullable: true,
    required: false,
  })
  hat: number | null;

  @ApiProperty({
    description: '액세서리 ID',
    example: 12,
    nullable: true,
    required: false,
  })
  accessory: number | null;

  @ApiProperty({
    description: '상의 ID',
    example: 5,
    nullable: true,
    required: false,
  })
  top: number | null;

  @ApiProperty({
    description: '하의 ID',
    example: 8,
    nullable: true,
    required: false,
  })
  bottom: number | null;

  @ApiProperty({
    description: '신발 ID',
    example: 3,
    nullable: true,
    required: false,
  })
  shoes: number | null;

  @ApiProperty({
    description: '이펙트 ID',
    example: 15,
    nullable: true,
    required: false,
  })
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
