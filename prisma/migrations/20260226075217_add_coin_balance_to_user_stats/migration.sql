-- AlterTable
ALTER TABLE "public"."user_stats" ADD COLUMN     "coin_balance" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "user_stats_period_period_start_coin_balance_level_user_id_idx" ON "public"."user_stats"("period", "period_start", "coin_balance" DESC, "level" DESC, "user_id");
