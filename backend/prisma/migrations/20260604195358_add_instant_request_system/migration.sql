/*
  Warnings:

  - You are about to drop the column `acceptedWorkers` on the `InstantRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requiredWorkers` on the `InstantRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestId` on the `InstantRequestResponse` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[itemId,workerId]` on the table `InstantRequestResponse` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `itemId` to the `InstantRequestResponse` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "InstantRequest" DROP CONSTRAINT "InstantRequest_skillId_fkey";

-- DropForeignKey
ALTER TABLE "InstantRequestResponse" DROP CONSTRAINT "InstantRequestResponse_requestId_fkey";

-- DropIndex
DROP INDEX "InstantRequest_skillId_idx";

-- DropIndex
DROP INDEX "InstantRequestResponse_requestId_workerId_key";

-- AlterTable
ALTER TABLE "InstantRequest" DROP COLUMN "acceptedWorkers",
DROP COLUMN "requiredWorkers",
ALTER COLUMN "skillId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InstantRequestResponse" DROP COLUMN "requestId",
ADD COLUMN     "itemId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "InstantRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "requiredWorkers" INTEGER NOT NULL,
    "acceptedWorkers" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InstantRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstantRequestItem_skillId_idx" ON "InstantRequestItem"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "InstantRequestResponse_itemId_workerId_key" ON "InstantRequestResponse"("itemId", "workerId");

-- AddForeignKey
ALTER TABLE "InstantRequest" ADD CONSTRAINT "InstantRequest_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantRequestResponse" ADD CONSTRAINT "InstantRequestResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InstantRequestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantRequestItem" ADD CONSTRAINT "InstantRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "InstantRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantRequestItem" ADD CONSTRAINT "InstantRequestItem_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
