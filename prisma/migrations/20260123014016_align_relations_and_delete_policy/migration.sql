/*
  Warnings:

  - You are about to drop the column `room_user_id` on the `drawings` table. All the data in the column will be lost.
  - You are about to drop the column `room_user_id` on the `match_results` table. All the data in the column will be lost.
  - You are about to drop the column `user_tier` on the `room_members` table. All the data in the column will be lost.
  - You are about to drop the column `match_id` on the `votes` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[match_id,room_member_id]` on the table `drawings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[room_member_id,match_id]` on the table `match_results` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[drawing_id,voter_id]` on the table `votes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `room_member_id` to the `drawings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `room_member_id` to the `match_results` table without a default value. This is not possible if the table is not empty.
  - Made the column `user_id` on table `room_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_nickname` on table `room_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `user_level` on table `room_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `voter_id` on table `votes` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "public"."MatchStatus" ADD VALUE 'LOADING';

-- DropForeignKey
ALTER TABLE "public"."drawings" DROP CONSTRAINT "drawings_room_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."match_results" DROP CONSTRAINT "match_results_room_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."matches" DROP CONSTRAINT "matches_topic_writer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."room_members" DROP CONSTRAINT "room_members_room_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."room_members" DROP CONSTRAINT "room_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_match_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."votes" DROP CONSTRAINT "votes_voter_id_fkey";

-- DropIndex
DROP INDEX "public"."drawings_match_id_room_user_id_key";

-- DropIndex
DROP INDEX "public"."match_results_room_user_id_match_id_key";

-- DropIndex
DROP INDEX "public"."votes_match_id_drawing_id_voter_id_key";

-- AlterTable
ALTER TABLE "public"."drawings" DROP COLUMN "room_user_id",
ADD COLUMN     "room_member_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."match_results" DROP COLUMN "room_user_id",
ADD COLUMN     "room_member_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."matches" ALTER COLUMN "topic" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."room_members" DROP COLUMN "user_tier",
ALTER COLUMN "room_id" DROP NOT NULL,
ALTER COLUMN "user_id" SET NOT NULL,
ALTER COLUMN "user_nickname" SET NOT NULL,
ALTER COLUMN "user_nickname" SET DATA TYPE VARCHAR(30),
ALTER COLUMN "user_level" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."votes" DROP COLUMN "match_id",
ALTER COLUMN "voter_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "drawings_match_id_room_member_id_key" ON "public"."drawings"("match_id", "room_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_results_room_member_id_match_id_key" ON "public"."match_results"("room_member_id", "match_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_drawing_id_voter_id_key" ON "public"."votes"("drawing_id", "voter_id");

-- AddForeignKey
ALTER TABLE "public"."room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."matches" ADD CONSTRAINT "matches_topic_writer_id_fkey" FOREIGN KEY ("topic_writer_id") REFERENCES "public"."room_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."match_results" ADD CONSTRAINT "match_results_room_member_id_fkey" FOREIGN KEY ("room_member_id") REFERENCES "public"."room_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."drawings" ADD CONSTRAINT "drawings_room_member_id_fkey" FOREIGN KEY ("room_member_id") REFERENCES "public"."room_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."votes" ADD CONSTRAINT "votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
