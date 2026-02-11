-- CreateEnum
CREATE TYPE "public"."CosmeticSubCategory" AS ENUM ('BIRD', 'ACC', 'HAT', 'TOP', 'BOTTOM', 'SHOES', 'EFFECT');

-- CreateTable
CREATE TABLE "public"."cosmetic_items" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "sub_category" "public"."CosmeticSubCategory" NOT NULL,
    "level" INTEGER NOT NULL,
    "image_path" VARCHAR(255) NOT NULL,

    CONSTRAINT "cosmetic_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserCosmeticItem" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "cosmetic_item_id" INTEGER NOT NULL,
    "equip_slot" "public"."CosmeticSubCategory",

    CONSTRAINT "UserCosmeticItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cosmetic_items_sub_category_idx" ON "public"."cosmetic_items"("sub_category");

-- CreateIndex
CREATE INDEX "cosmetic_items_level_idx" ON "public"."cosmetic_items"("level");

-- CreateIndex
CREATE UNIQUE INDEX "UserCosmeticItem_user_id_cosmetic_item_id_key" ON "public"."UserCosmeticItem"("user_id", "cosmetic_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserCosmeticItem_user_id_equip_slot_key" ON "public"."UserCosmeticItem"("user_id", "equip_slot");

-- AddForeignKey
ALTER TABLE "public"."UserCosmeticItem" ADD CONSTRAINT "UserCosmeticItem_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserCosmeticItem" ADD CONSTRAINT "UserCosmeticItem_cosmetic_item_id_fkey" FOREIGN KEY ("cosmetic_item_id") REFERENCES "public"."cosmetic_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
