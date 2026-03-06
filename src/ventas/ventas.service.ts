import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------
  // Crear venta segura por restaurante
  // ---------------------------------------------------
  async crearVenta(
    restaurantId: number,
    data: {
      userId: number;
      cajaId?: number;
      payment: string;
      items: {
        productId: number;
        quantity: number;
        priceUnit: number;
      }[];
    },
  ) {
    // Validar que el usuario pertenezca al restaurante
    const user = await this.prisma.user.findFirst({
      where: { id: data.userId, restaurantId },
    });

    if (!user) {
      throw new ForbiddenException(
        'Usuario no pertenece a este restaurante',
      );
    }

    // Validar caja si viene
    if (data.cajaId) {
      const caja = await this.prisma.caja.findFirst({
        where: { id: data.cajaId, restaurantId },
      });

      if (!caja) {
        throw new ForbiddenException(
          'Caja no pertenece a este restaurante',
        );
      }
    }

    // Calcular total
    const total = data.items.reduce(
      (sum, item) => sum + item.quantity * item.priceUnit,
      0,
    );

    // 1️⃣ Validar stock por restaurante
    for (const item of data.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, restaurantId },
        include: {
          inventoryUsage: {
            include: { inventoryItem: true },
          },
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Producto ${item.productId} no pertenece a este restaurante`,
        );
      }

      for (const usage of product.inventoryUsage) {
        const necesidad = usage.quantity * item.quantity;

        if (usage.inventoryItem.stock < necesidad) {
          throw new BadRequestException(
            `No hay suficiente inventario de ${usage.inventoryItem.name}`,
          );
        }
      }
    }

    // 2️⃣ Crear venta
    const venta = await this.prisma.sale.create({
      data: {
        restaurantId,
        userId: data.userId,
        cajaId: data.cajaId,
        total,
        payment: data.payment,
        items: {
          create: data.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            priceUnit: i.priceUnit,
            subtotal: i.quantity * i.priceUnit,
          })),
        },
      },
      include: {
        user: true,
        items: true,
      },
    });

    // 3️⃣ Descontar inventario
    for (const item of data.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, restaurantId },
        include: { inventoryUsage: true },
      });

      if (!product) {
        throw new NotFoundException(`Producto ${item.productId} no existe`);
      }

      for (const usage of product.inventoryUsage) {
        const descontar = usage.quantity * item.quantity;

        await this.prisma.inventoryItem.update({
          where: { id: usage.inventoryItemId },
          data: {
            stock: {
              decrement: descontar,
            },
          },
        });
      }
    }

    return venta;
  }

  // ---------------------------------------------------
  // Listar ventas del restaurante
  // ---------------------------------------------------
  async listarVentas(restaurantId: number) {
    return this.prisma.sale.findMany({
      where: { restaurantId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  // ---------------------------------------------------
  // Detalle de venta segura
  // ---------------------------------------------------
  async detalleVenta(restaurantId: number, id: number) {
    const venta = await this.prisma.sale.findFirst({
      where: { id, restaurantId },
      include: {
        user: true,
        items: { include: { product: true } },
      },
    });

    if (!venta)
      throw new NotFoundException(
        'Venta no encontrada o no pertenece a este restaurante',
      );

    return venta;
  }
}