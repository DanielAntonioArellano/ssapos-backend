/*
  Warnings:

  - You are about to drop the `InventoryComponent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryComponent" DROP CONSTRAINT "InventoryComponent_componentId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryComponent" DROP CONSTRAINT "InventoryComponent_productId_fkey";

-- DropTable
DROP TABLE "InventoryComponent";

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "stock" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryUsage" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "inventoryItemId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryUsage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryUsage" ADD CONSTRAINT "InventoryUsage_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
