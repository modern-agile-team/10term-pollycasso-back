/*
  Warnings:

  - Added the required column `level` to the `game_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."game_items" ADD COLUMN     "level" INTEGER NOT NULL;
