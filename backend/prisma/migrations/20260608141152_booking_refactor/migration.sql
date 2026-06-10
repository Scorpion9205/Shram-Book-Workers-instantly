/*
  Warnings:

  - A unique constraint covering the columns `[instantRequestResponseId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_jobId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "instantRequestId" TEXT,
ADD COLUMN     "instantRequestResponseId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "jobId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Booking_providerId_idx" ON "Booking"("providerId");

-- CreateIndex
CREATE INDEX "Booking_workerId_idx" ON "Booking"("workerId");

-- CreateIndex
CREATE INDEX "Booking_agentId_idx" ON "Booking"("agentId");

-- CreateIndex
CREATE INDEX "Booking_jobId_idx" ON "Booking"("jobId");

-- CreateIndex
CREATE INDEX "Booking_instantRequestId_idx" ON "Booking"("instantRequestId");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_instantRequestResponseId_key" ON "Booking"("instantRequestResponseId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_instantRequestId_fkey" FOREIGN KEY ("instantRequestId") REFERENCES "InstantRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_instantRequestResponseId_fkey" FOREIGN KEY ("instantRequestResponseId") REFERENCES "InstantRequestResponse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
