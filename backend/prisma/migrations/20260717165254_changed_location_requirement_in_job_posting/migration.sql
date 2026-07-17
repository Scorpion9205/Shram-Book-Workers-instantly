/*
  Warnings:

  - You are about to drop the column `estimatedDays` on the `Application` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Application" DROP COLUMN "estimatedDays";

-- AlterTable
ALTER TABLE "Job" ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL;
