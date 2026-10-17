-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "duesRequestId" TEXT,
ADD COLUMN     "platformDueSettledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PayoutRequest" ADD COLUMN     "duesDeducted" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_duesRequestId_fkey" FOREIGN KEY ("duesRequestId") REFERENCES "PayoutRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
