-- CreateEnum
CREATE TYPE "public"."FriendStatus" AS ENUM ('PENDING', 'ACCEPTED');

-- CreateTable
CREATE TABLE "public"."friends" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "targetUserId" INTEGER NOT NULL,
    "status" "public"."FriendStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "friends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."block_lists" (
    "id" SERIAL NOT NULL,
    "blockerId" INTEGER NOT NULL,
    "blockedId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "block_lists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friends_userId_status_idx" ON "public"."friends"("userId", "status");

-- CreateIndex
CREATE INDEX "friends_targetUserId_status_idx" ON "public"."friends"("targetUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friends_userId_targetUserId_key" ON "public"."friends"("userId", "targetUserId");

-- CreateIndex
CREATE INDEX "block_lists_blockedId_idx" ON "public"."block_lists"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "block_lists_blockerId_blockedId_key" ON "public"."block_lists"("blockerId", "blockedId");

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."friends" ADD CONSTRAINT "friends_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."block_lists" ADD CONSTRAINT "block_lists_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."block_lists" ADD CONSTRAINT "block_lists_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
