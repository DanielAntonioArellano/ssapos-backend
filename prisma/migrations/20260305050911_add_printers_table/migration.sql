-- CreateEnum
CREATE TYPE "PrinterRole" AS ENUM ('CAJA', 'COCINA', 'BARRA');

-- CreateTable
CREATE TABLE "Printer" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 9100,
    "role" "PrinterRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
