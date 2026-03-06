import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service'; // para validar stock / info de producto
import { VentasService } from '../ventas/ventas.service'; // para crear sale en checkout (si lo tienes así)

@Module({
  imports: [],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService, ProductsService, VentasService],
  exports: [OrdersService],
})
export class OrdersModule {}
