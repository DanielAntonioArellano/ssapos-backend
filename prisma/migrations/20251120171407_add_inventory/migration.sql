-- CreateTable
CREATE TABLE "InventoryComponent" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "InventoryComponent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InventoryComponent" ADD CONSTRAINT "InventoryComponent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryComponent" ADD CONSTRAINT "InventoryComponent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
