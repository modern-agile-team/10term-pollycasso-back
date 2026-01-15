/*
  Warnings:

  - The values [LOADING] on the enum `RoomStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."RoomStatus_new" AS ENUM ('WAITING', 'IN_PROGRESS', 'FINISHED');
ALTER TABLE "public"."rooms" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."rooms" ALTER COLUMN "status" TYPE "public"."RoomStatus_new" USING ("status"::text::"public"."RoomStatus_new");
ALTER TYPE "public"."RoomStatus" RENAME TO "RoomStatus_old";
ALTER TYPE "public"."RoomStatus_new" RENAME TO "RoomStatus";
DROP TYPE "public"."RoomStatus_old";
ALTER TABLE "public"."rooms" ALTER COLUMN "status" SET DEFAULT 'WAITING';
COMMIT;
