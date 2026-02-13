import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OutfitAssetPaths, OutfitIds } from './outfit.type';
import { DEFAULT_OUTFIT } from './constants/outfit.constant';

@Injectable()
export class OutfitConverterService {
  constructor(private readonly prisma: PrismaService) {}

  async convertPathsToIds(paths: OutfitAssetPaths | undefined | null): Promise<OutfitIds> {
    if (!paths) {
      return DEFAULT_OUTFIT;
    }

    const allPaths = Object.values(paths).filter((p): p is string => p !== null && p !== undefined);

    if (allPaths.length === 0) {
      return DEFAULT_OUTFIT;
    }

    const items = await this.prisma.cosmeticItem.findMany({
      where: { imagePath: { in: allPaths } },
      select: { id: true, imagePath: true },
    });

    const pathToIdMap = new Map(items.map((i) => [i.imagePath, i.id]));

    return {
      bird: paths.bird ? (pathToIdMap.get(paths.bird) ?? DEFAULT_OUTFIT.bird) : DEFAULT_OUTFIT.bird,
      hat: paths.hat ? (pathToIdMap.get(paths.hat) ?? null) : null,
      accessory: paths.accessory ? (pathToIdMap.get(paths.accessory) ?? null) : null,
      top: paths.top ? (pathToIdMap.get(paths.top) ?? null) : null,
      bottom: paths.bottom ? (pathToIdMap.get(paths.bottom) ?? null) : null,
      shoes: paths.shoes ? (pathToIdMap.get(paths.shoes) ?? null) : null,
      effect: paths.effect ? (pathToIdMap.get(paths.effect) ?? null) : null,
    };
  }

  async convertIdsToPath(ids: OutfitIds | undefined | null): Promise<OutfitAssetPaths> {
    if (!ids) {
      return {
        bird: 'bird_01',
        hat: null,
        accessory: null,
        top: null,
        bottom: null,
        shoes: null,
        effect: null,
      };
    }

    const allIds = Object.values(ids).filter((i): i is number => i !== null && i !== undefined);

    if (allIds.length === 0) {
      return {
        bird: 'bird_01',
        hat: null,
        accessory: null,
        top: null,
        bottom: null,
        shoes: null,
        effect: null,
      };
    }

    const items = await this.prisma.cosmeticItem.findMany({
      where: { id: { in: allIds } },
      select: { id: true, imagePath: true },
    });

    const idToPathMap = new Map(items.map((i) => [i.id, i.imagePath]));

    return {
      bird: idToPathMap.get(ids.bird) ?? 'bird_01',
      hat: ids.hat ? (idToPathMap.get(ids.hat) ?? null) : null,
      accessory: ids.accessory ? (idToPathMap.get(ids.accessory) ?? null) : null,
      top: ids.top ? (idToPathMap.get(ids.top) ?? null) : null,
      bottom: ids.bottom ? (idToPathMap.get(ids.bottom) ?? null) : null,
      shoes: ids.shoes ? (idToPathMap.get(ids.shoes) ?? null) : null,
      effect: ids.effect ? (idToPathMap.get(ids.effect) ?? null) : null,
    };
  }
}
