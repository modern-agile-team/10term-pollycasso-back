import { Module } from '@nestjs/common';
import { OutfitConverterService } from './outfit-converter.service';
import { WardrobeRepository } from 'src/wardrobe/wardrobe.repository';

@Module({
  providers: [
    OutfitConverterService,
    WardrobeRepository,
    {
      provide: 'IWardrobeRepository',
      useExisting: WardrobeRepository,
    },
  ],
  exports: [OutfitConverterService, 'IWardrobeRepository'],
})
export class OutfitModule {}
