import { OutfitIds } from 'src/outfit/outfit.type';
import { OutfitDataDto } from '../outfit-data.dto';

export class UpdateOutfitResponseDto {
  data: {
    outfit: OutfitDataDto;
  };

  constructor(outfit: OutfitIds) {
    this.data = {
      outfit: new OutfitDataDto(outfit),
    };
  }
}
