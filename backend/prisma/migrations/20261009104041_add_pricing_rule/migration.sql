-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "minFare" DECIMAL(65,30),
    "maxFare" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_skillId_key" ON "PricingRule"("skillId");

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

