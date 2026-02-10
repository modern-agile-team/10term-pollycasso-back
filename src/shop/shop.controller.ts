import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ShopService } from './shop.service';
import { PurchaseItemsRequestDto } from './dtos/requests/purchase-items.request.dto';
import { ShopItemsResponseDto } from './dtos/responses/shop-items.response.dto';
import { InventoryIdsResponseDto } from './dtos/responses/inventory-ids.response.dto';
import { PurchaseResultResponseDto } from './dtos/responses/purchase-result.response.dto';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('shop')
@UseGuards(AccessTokenGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('items')
  async getItems(@CurrentUser() user: JwtPayload): Promise<ShopItemsResponseDto> {
    return this.shopService.getShopItems(user.sub);
  }

  @Get('inventory')
  async getMyInventory(@CurrentUser() user: JwtPayload): Promise<InventoryIdsResponseDto> {
    return this.shopService.getMyInventoryIds(user.sub);
  }

  @Post('purchase')
  async purchase(
    @CurrentUser() user: JwtPayload,
    @Body() body: PurchaseItemsRequestDto,
  ): Promise<PurchaseResultResponseDto> {
    return this.shopService.purchaseItems(user.sub, body.itemIds);
  }
}
