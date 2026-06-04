-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "ProviderProfile" ADD COLUMN     "providerType" "ProviderType" NOT NULL DEFAULT 'INDIVIDUAL';
