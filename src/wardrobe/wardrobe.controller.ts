import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { WardrobeService } from './wardrobe.service';
import { UpdateOutfitRequestDto } from './dtos/requests/update-outfit.request.dto';
import { UpdateOutfitResponseDto } from './dtos/responses/update-outfit.response.dto';
import { WardrobeCosmeticInventoryResponseDto } from './dtos/responses/wardrobe-cosmetic-inventory.response.dto';
import { WardrobeConsumableInventoryResponseDto } from './dtos/responses/wardrobe-consumable-inventory.response.dto';

@ApiTags('wardrobe')
@Controller('wardrobe')
@UseGuards(AccessTokenGuard)
@ApiBearerAuth()
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  async getCosmeticInventory(
    @CurrentUser() user: JwtPayload,
  ): Promise<WardrobeCosmeticInventoryResponseDto> {
    return this.wardrobeService.getCosmeticInventory(user.sub);
  }

  @Get('consumables')
  async getConsumableInventory(
    @CurrentUser() user: JwtPayload,
  ): Promise<WardrobeConsumableInventoryResponseDto> {
    return this.wardrobeService.getConsumableInventory(user.sub);
  }

  @Patch()
  async updateOutfit(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdateOutfitRequestDto,
  ): Promise<UpdateOutfitResponseDto> {
    return this.wardrobeService.updateOutfit(user.sub, body);
  }
}
