/*
  Warnings:

  - The primary key for the `user_stats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `total_draws` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `total_loses` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `total_matches` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `total_votes_received` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `total_wins` on the `user_stats` table. All the data in the column will be lost.
  - You are about to drop the column `win_rate` on the `user_stats` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,period]` on the table `user_stats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `period` to the `user_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period_end` to the `user_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `period_start` to the `user_stats` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."StatsPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- DropIndex
DROP INDEX "public"."user_stats_win_rate_idx";

-- AlterTable
ALTER TABLE "public"."user_stats" DROP CONSTRAINT "user_stats_pkey",
DROP COLUMN "total_draws",
DROP COLUMN "total_loses",
DROP COLUMN "total_matches",
DROP COLUMN "total_votes_received",
DROP COLUMN "total_wins",
DROP COLUMN "win_rate",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "level" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "period" "public"."StatsPeriod" NOT NULL,
ADD COLUMN     "period_end" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "period_start" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "rank" INTEGER,
ADD COLUMN     "total_score" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "user_stats_period_period_start_total_score_level_user_id_idx" ON "public"."user_stats"("period", "period_start", "total_score" DESC, "level" DESC, "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_stats_user_id_period_key" ON "public"."user_stats"("user_id", "period");
