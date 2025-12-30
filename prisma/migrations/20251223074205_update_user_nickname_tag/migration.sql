/*
  Warnings:

  - A unique constraint covering the columns `[nickname,tag]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tag` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "tag" VARCHAR(10) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_tag_key" ON "public"."users"("nickname", "tag");
