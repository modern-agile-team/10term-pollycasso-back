/*
  Warnings:

  - You are about to drop the column `profile_image` on the `user_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."user_profiles" DROP COLUMN "profile_image",
ADD COLUMN     "outfit" JSONB;
