import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { ShopService } from './shop.service';
import { PurchaseItemsRequestDto } from './dtos/requests/purchase-items.request.dto';
import { GameItemsResponseDto } from './dtos/responses/game-items.response.dto';
import { PurchaseResultResponseDto } from './dtos/responses/purchase-result.response.dto';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CosmeticItemsResponseDto } from './dtos/responses/cosmetic-items.response.dto';
import { InventoryIdsResponseDto } from './dtos/responses/inventory-ids.response.dto';

@Controller('shop')
@UseGuards(AccessTokenGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get('cosmetics')
  async getCosmetics(@CurrentUser() user: JwtPayload): Promise<CosmeticItemsResponseDto> {
    return this.shopService.getCosmetics(user.sub);
  }

  @Get('consumables')
  async getConsumables(@CurrentUser() user: JwtPayload): Promise<GameItemsResponseDto> {
    return this.shopService.getConsumables(user.sub);
  }

  @Get('inventory/cosmetics')
  async getMyCosmeticInventoryIds(
    @CurrentUser() user: JwtPayload,
  ): Promise<InventoryIdsResponseDto> {
    return this.shopService.getMyCosmeticInventoryIds(user.sub);
  }

  @Post('purchase')
  async purchase(
    @CurrentUser() user: JwtPayload,
    @Body() body: PurchaseItemsRequestDto,
  ): Promise<PurchaseResultResponseDto> {
    return this.shopService.purchaseItems(user.sub, body);
  }
}
