import { Module } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { WardrobeController } from './wardrobe.controller';
import { WardrobeRepository } from './wardrobe.repository';

@Module({
  controllers: [WardrobeController],
  providers: [
    WardrobeService,
    {
      provide: 'IWardrobeRepository',
      useClass: WardrobeRepository,
    },
  ],
  exports: [WardrobeService],
})
export class WardrobeModule {}
