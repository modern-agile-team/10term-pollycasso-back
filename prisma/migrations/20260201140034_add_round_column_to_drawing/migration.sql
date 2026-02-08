/*
  Warnings:

  - A unique constraint covering the columns `[match_id,room_member_id,round]` on the table `drawings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `round` to the `drawings` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."drawings_match_id_room_member_id_key";

-- AlterTable
ALTER TABLE "public"."drawings" ADD COLUMN     "round" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drawings_match_id_room_member_id_round_key" ON "public"."drawings"("match_id", "room_member_id", "round");
