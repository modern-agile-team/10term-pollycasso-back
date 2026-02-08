/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `game_items` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `game_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cooldown_ms` to the `game_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration_ms` to the `game_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."game_items" ADD COLUMN     "code" VARCHAR(20) NOT NULL,
ADD COLUMN     "cooldown_ms" INTEGER NOT NULL,
ADD COLUMN     "duration_ms" INTEGER NOT NULL,
ALTER COLUMN "effect" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "game_items_code_key" ON "public"."game_items"("code");
