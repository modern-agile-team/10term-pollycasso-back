import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShopService } from './shop.service';
import { ShopController } from './shop.controller';
import { ShopRepository } from './shop.repository';

@Module({
  providers: [ShopService, PrismaService, { provide: 'IShopRepository', useClass: ShopRepository }],
  controllers: [ShopController],
  exports: [ShopService],
})
export class ShopModule {}
