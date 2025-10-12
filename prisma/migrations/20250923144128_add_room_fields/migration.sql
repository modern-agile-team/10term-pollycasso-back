-- CreateEnum
CREATE TYPE "public"."RoomStatus" AS ENUM ('WAITING', 'IN_PROGRESS');

-- AlterTable
ALTER TABLE "public"."rooms" ADD COLUMN     "currentPlayers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "public"."RoomStatus" NOT NULL DEFAULT 'WAITING';
