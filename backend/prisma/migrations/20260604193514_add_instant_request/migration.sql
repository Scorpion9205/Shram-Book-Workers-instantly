-- CreateEnum
CREATE TYPE "InstantRequestStatus" AS ENUM ('OPEN', 'FILLED', 'EXPIRED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "InstantResponseStatus" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "InstantRequest" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "requiredWorkers" INTEGER NOT NULL,
    "acceptedWorkers" INTEGER NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "InstantRequestStatus" NOT NULL DEFAULT 'OPEN',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstantRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstantRequestResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "status" "InstantResponseStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstantRequestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstantRequest_providerId_idx" ON "InstantRequest"("providerId");

-- CreateIndex
CREATE INDEX "InstantRequest_skillId_idx" ON "InstantRequest"("skillId");

-- CreateIndex
CREATE INDEX "InstantRequest_status_idx" ON "InstantRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "InstantRequestResponse_requestId_workerId_key" ON "InstantRequestResponse"("requestId", "workerId");

-- AddForeignKey
ALTER TABLE "InstantRequest" ADD CONSTRAINT "InstantRequest_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantRequest" ADD CONSTRAINT "InstantRequest_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantRequestResponse" ADD CONSTRAINT "InstantRequestResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "InstantRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstantRequestResponse" ADD CONSTRAINT "InstantRequestResponse_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
