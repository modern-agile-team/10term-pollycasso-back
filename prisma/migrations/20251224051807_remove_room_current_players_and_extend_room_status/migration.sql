/*
  Warnings:

  - The values [A,B] on the enum `Team` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `currentPlayers` on the `rooms` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."RoomStatus" ADD VALUE 'LOADING';
ALTER TYPE "public"."RoomStatus" ADD VALUE 'FINISHED';

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Team_new" AS ENUM ('RED', 'BLUE', 'NONE');
ALTER TABLE "public"."room_members" ALTER COLUMN "team" DROP DEFAULT;
ALTER TABLE "public"."room_members" ALTER COLUMN "team" TYPE "public"."Team_new" USING ("team"::text::"public"."Team_new");
ALTER TYPE "public"."Team" RENAME TO "Team_old";
ALTER TYPE "public"."Team_new" RENAME TO "Team";
DROP TYPE "public"."Team_old";
ALTER TABLE "public"."room_members" ALTER COLUMN "team" SET DEFAULT 'NONE';
COMMIT;

-- AlterTable
ALTER TABLE "public"."rooms" DROP COLUMN "currentPlayers";
