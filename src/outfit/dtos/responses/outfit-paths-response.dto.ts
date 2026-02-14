import { ApiProperty } from '@nestjs/swagger';
import { OutfitAssetPaths } from 'src/outfit/outfit.type';

export class OutfitPathsResponseDto {
  @ApiProperty({
    description: '새 이미지 경로',
    example: 'bird_01',
  })
  bird: string;

  @ApiProperty({
    description: '모자 이미지 경로',
    nullable: true,
    example: 'hat_01',
    required: false,
  })
  hat: string | null;

  @ApiProperty({
    description: '액세서리 이미지 경로',
    nullable: true,
    example: 'accessory_01',
    required: false,
  })
  accessory: string | null;

  @ApiProperty({
    description: '상의 이미지 경로',
    nullable: true,
    example: 'top_01',
    required: false,
  })
  top: string | null;

  @ApiProperty({
    description: '하의 이미지 경로',
    nullable: true,
    example: 'bottom_01',
    required: false,
  })
  bottom: string | null;

  @ApiProperty({
    description: '신발 이미지 경로',
    nullable: true,
    example: 'shoes_01',
    required: false,
  })
  shoes: string | null;

  @ApiProperty({
    description: '이펙트 이미지 경로',
    nullable: true,
    example: 'effect_01',
    required: false,
  })
  effect: string | null;

  constructor(outfit: OutfitAssetPaths) {
    this.bird = outfit.bird;
    this.hat = outfit.hat;
    this.accessory = outfit.accessory;
    this.top = outfit.top;
    this.bottom = outfit.bottom;
    this.shoes = outfit.shoes;
    this.effect = outfit.effect;
  }
}
