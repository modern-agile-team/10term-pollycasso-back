/*
  Warnings:

  - You are about to drop the column `introduce` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `is_online` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `is_tutorial_completed` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `last_login_at` on the `user_profiles` table. All the data in the column will be lost.
  - You are about to drop the column `total_attendance` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."user_profiles" DROP COLUMN "introduce",
DROP COLUMN "is_online",
DROP COLUMN "is_tutorial_completed",
DROP COLUMN "last_login_at",
DROP COLUMN "total_attendance";
