/*
  Warnings:

  - You are about to drop the column `target_user_id` on the `friends` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `friends` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[requester_id,receiver_id]` on the table `friends` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `receiver_id` to the `friends` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requester_id` to the `friends` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."friends" DROP CONSTRAINT "friends_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."friends" DROP CONSTRAINT "friends_user_id_fkey";

-- DropIndex
DROP INDEX "public"."friends_target_user_id_status_idx";

-- DropIndex
DROP INDEX "public"."friends_user_id_status_idx";

-- DropIndex
DROP INDEX "public"."friends_user_id_target_user_id_key";

-- AlterTable
ALTER TABLE "public"."friends" DROP COLUMN "target_user_id",
DROP COLUMN "user_id",
ADD COLUMN     "receiver_id" INTEGER NOT NULL,
ADD COLUMN     "requester_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "friends_receiver_id_status_idx" ON "public"."friends"("receiver_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friends_requester_id_receiver_id_key" ON "public"."friends"("requester_id", "receiver_id");

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
