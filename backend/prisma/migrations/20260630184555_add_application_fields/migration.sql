/*
  Warnings:

  - Added the required column `updatedAt` to the `AgentProfile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `AgentWorker` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applicantType` to the `Application` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('WORKER', 'AGENT');

-- DropForeignKey
ALTER TABLE "AgentWorker" DROP CONSTRAINT "AgentWorker_agentId_fkey";

-- DropForeignKey
ALTER TABLE "AgentWorker" DROP CONSTRAINT "AgentWorker_workerId_fkey";

-- AlterTable
ALTER TABLE "AgentProfile" ADD COLUMN     "city" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "AgentWorker" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "applicantType" "ApplicantType" NOT NULL,
ADD COLUMN     "estimatedDays" INTEGER,
ADD COLUMN     "message" TEXT;

-- CreateTable
CREATE TABLE "BookingWorker" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingWorker_bookingId_workerId_key" ON "BookingWorker"("bookingId", "workerId");

-- CreateIndex
CREATE INDEX "AgentWorker_agentId_idx" ON "AgentWorker"("agentId");

-- CreateIndex
CREATE INDEX "AgentWorker_workerId_idx" ON "AgentWorker"("workerId");

-- AddForeignKey
ALTER TABLE "AgentWorker" ADD CONSTRAINT "AgentWorker_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentWorker" ADD CONSTRAINT "AgentWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWorker" ADD CONSTRAINT "BookingWorker_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingWorker" ADD CONSTRAINT "BookingWorker_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
