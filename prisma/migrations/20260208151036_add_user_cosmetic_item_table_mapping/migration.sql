/*
  Warnings:

  - You are about to drop the `UserCosmeticItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserCosmeticItem" DROP CONSTRAINT "UserCosmeticItem_cosmetic_item_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserCosmeticItem" DROP CONSTRAINT "UserCosmeticItem_user_id_fkey";

-- DropTable
DROP TABLE "public"."UserCosmeticItem";

-- CreateTable
CREATE TABLE "public"."user_cosmetic_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "cosmetic_item_id" INTEGER NOT NULL,
    "equip_slot" "public"."CosmeticSubCategory",

    CONSTRAINT "user_cosmetic_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_cosmetic_items_user_id_cosmetic_item_id_key" ON "public"."user_cosmetic_items"("user_id", "cosmetic_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_cosmetic_items_user_id_equip_slot_key" ON "public"."user_cosmetic_items"("user_id", "equip_slot");

-- AddForeignKey
ALTER TABLE "public"."user_cosmetic_items" ADD CONSTRAINT "user_cosmetic_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_cosmetic_items" ADD CONSTRAINT "user_cosmetic_items_cosmetic_item_id_fkey" FOREIGN KEY ("cosmetic_item_id") REFERENCES "public"."cosmetic_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
