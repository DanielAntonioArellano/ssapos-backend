-- CreateTable
CREATE TABLE "PrintQueue" (
    "id" SERIAL NOT NULL,
    "restaurantId" INTEGER NOT NULL,
    "printerIp" TEXT NOT NULL,
    "printerPort" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PrintQueue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PrintQueue" ADD CONSTRAINT "PrintQueue_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
