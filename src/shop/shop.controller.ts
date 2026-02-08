import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ShopService } from './shop.service';
import { PurchaseItemsRequestDto } from './dtos/requests/purchase-items.request.dto';
import { ShopItemsResponseDto } from './dtos/responses/shop-items.response.dto';
import { InventoryIdsResponseDto } from './dtos/responses/inventory-ids.response.dto';
import { PurchaseResultResponseDto } from './dtos/responses/purchase-result.response.dto';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('shop')
@UseGuards(AccessTokenGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async getItems(@Req() req: { user: JwtPayload }): Promise<ShopItemsResponseDto> {
    return this.shopService.getShopItems(req.user.sub);
  }

  @Get('myInventory')
  async getMyInventory(@Req() req: { user: JwtPayload }): Promise<InventoryIdsResponseDto> {
    return this.shopService.getMyInventoryIds(req.user.sub);
  }

  @Post('purchase')
  async purchase(
    @Req() req: { user: JwtPayload },
    @Body() body: PurchaseItemsRequestDto,
  ): Promise<PurchaseResultResponseDto> {
    return this.shopService.purchaseItems(req.user.sub, body.itemIds);
  }
}
