/*
  Warnings:

  - You are about to drop the column `result` on the `match_results` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."match_results_result_idx";

-- AlterTable
ALTER TABLE "public"."match_results" DROP COLUMN "result",
ADD COLUMN     "awarded_coin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "awarded_xp" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outcome" "public"."Result",
ADD COLUMN     "placement" INTEGER,
ADD COLUMN     "rewarded_at" TIMESTAMP(3),
ADD COLUMN     "score" INTEGER,
ADD COLUMN     "team" "public"."Team" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "game_items_level_idx" ON "public"."game_items"("level");

-- CreateIndex
CREATE INDEX "match_results_outcome_idx" ON "public"."match_results"("outcome");

-- CreateIndex
CREATE INDEX "match_results_match_id_idx" ON "public"."match_results"("match_id");
