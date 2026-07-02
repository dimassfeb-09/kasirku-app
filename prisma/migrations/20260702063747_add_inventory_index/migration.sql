-- AlterEnum
ALTER TYPE "AdjustmentReason" ADD VALUE 'SALE';

-- CreateIndex
CREATE INDEX "inventory_storeId_quantity_idx" ON "inventory"("storeId", "quantity");
