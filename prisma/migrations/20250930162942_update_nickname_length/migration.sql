/*
  Warnings:

  - You are about to alter the column `username` on the `users` table. The data in that column could be lost. The data in that column will be cast from `VarChar(30)` to `VarChar(20)`.

*/
-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "username" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "nickname" SET DATA TYPE VARCHAR(30);
