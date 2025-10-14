/*
  Warnings:

  - The values [NAVER] on the enum `Provider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `deleted_at` on the `drawings` table. All the data in the column will be lost.
  - You are about to drop the column `deleted_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `is_deleted` on the `users` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."Provider_new" AS ENUM ('GOOGLE', 'KAKAO');
ALTER TABLE "public"."users" ALTER COLUMN "provider" TYPE "public"."Provider_new" USING ("provider"::text::"public"."Provider_new");
ALTER TYPE "public"."Provider" RENAME TO "Provider_old";
ALTER TYPE "public"."Provider_new" RENAME TO "Provider";
DROP TYPE "public"."Provider_old";
COMMIT;

-- AlterTable
ALTER TABLE "public"."drawings" DROP COLUMN "deleted_at";

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "deleted_at",
DROP COLUMN "is_deleted";
