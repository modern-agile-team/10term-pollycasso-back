/*
  Warnings:

  - You are about to drop the column `createdAt` on the `friends` table. All the data in the column will be lost.
  - You are about to drop the column `targetUserId` on the `friends` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `friends` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `friends` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id,target_user_id]` on the table `friends` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `target_user_id` to the `friends` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `friends` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `friends` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."friends" DROP CONSTRAINT "friends_targetUserId_fkey";

-- DropForeignKey
ALTER TABLE "public"."friends" DROP CONSTRAINT "friends_userId_fkey";

-- DropIndex
DROP INDEX "public"."friends_targetUserId_status_idx";

-- DropIndex
DROP INDEX "public"."friends_userId_status_idx";

-- DropIndex
DROP INDEX "public"."friends_userId_targetUserId_key";

-- AlterTable
ALTER TABLE "public"."friends" DROP COLUMN "createdAt",
DROP COLUMN "targetUserId",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "target_user_id" INTEGER NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "friends_user_id_status_idx" ON "public"."friends"("user_id", "status");

-- CreateIndex
CREATE INDEX "friends_target_user_id_status_idx" ON "public"."friends"("target_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friends_user_id_target_user_id_key" ON "public"."friends"("user_id", "target_user_id");

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
