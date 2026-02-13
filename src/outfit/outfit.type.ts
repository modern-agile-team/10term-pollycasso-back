export type OutfitIds = {
  bird: number;
  hat: number | null;
  accessory: number | null;
  top: number | null;
  bottom: number | null;
  shoes: number | null;
  effect: number | null;
};

export type OutfitAssetPaths = {
  bird: string;
  hat: string | null;
  accessory: string | null;
  top: string | null;
  bottom: string | null;
  shoes: string | null;
  effect: string | null;
};

export type Outfit = OutfitIds;
