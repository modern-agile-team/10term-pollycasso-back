/*
  Warnings:

  - You are about to drop the column `image_path` on the `drawings` table. All the data in the column will be lost.
  - Added the required column `data` to the `drawings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "public"."MatchStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "public"."drawings" DROP COLUMN "image_path",
ADD COLUMN     "data" JSONB NOT NULL;
