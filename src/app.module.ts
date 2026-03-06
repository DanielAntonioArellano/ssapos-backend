import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CajaModule } from './caja/caja.module';
import { VentasModule } from './ventas/ventas.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { CategoriesModule } from './categories/categories.module';
import { PrintersModule } from './modules/printers/printers.module';
import { PrinterModule } from './printer/printer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    VentasModule,
    CajaModule,
    InventoryModule,
    OrdersModule,
    TicketsModule,
    RestaurantsModule,
    CategoriesModule,
    PrintersModule,
    PrinterModule,
  ],
})
export class AppModule {}
