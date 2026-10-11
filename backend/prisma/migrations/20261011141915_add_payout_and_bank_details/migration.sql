-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "payoutMethod" TEXT,
ADD COLUMN     "payoutPaidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "WorkerProfile" ADD COLUMN     "bankAccountHolderName" TEXT,
ADD COLUMN     "bankAccountNumber" TEXT,
ADD COLUMN     "bankIfscCode" TEXT,
ADD COLUMN     "bankName" TEXT;

