/*
  Warnings:

  - You are about to drop the `InventoryUsage` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `unit` on table `InventoryItem` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "InventoryUsage" DROP CONSTRAINT "InventoryUsage_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryUsage" DROP CONSTRAINT "InventoryUsage_productId_fkey";

-- AlterTable
ALTER TABLE "InventoryItem" ALTER COLUMN "unit" SET NOT NULL;

-- DropTable
DROP TABLE "InventoryUsage";

-- CreateTable
CREATE TABLE "ProductInventoryUsage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductInventoryUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductInventoryUsage" ADD CONSTRAINT "ProductInventoryUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventoryUsage" ADD CONSTRAINT "ProductInventoryUsage_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
