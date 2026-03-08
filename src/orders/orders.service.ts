import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private async validarPassword(userId: number, password: string) {
    if (!password) throw new ForbiddenException('Se requiere contraseña');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new ForbiddenException('Usuario no encontrado');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new ForbiddenException('Contraseña incorrecta');
  }

  async create(restaurantId: number, dto: CreateOrderDto) {
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, restaurantId },
      });

      if (!user) {
        throw new ForbiddenException('Usuario no pertenece a este restaurante');
      }
    }

    if (dto.type === 'DINE_IN' && !dto.tableNumber) {
      throw new BadRequestException('Las órdenes DINE_IN requieren tableNumber');
    }

    const itemsData: {
      productId: number | null;
      customName: string | null;
      quantity: number;
      priceUnit: number;
      subtotal: number;
    }[] = [];

    for (const i of dto.items) {
      if (i.productId) {
        const product = await this.prisma.product.findFirst({
          where: { id: i.productId, restaurantId },
        });

        if (!product) {
          throw new NotFoundException(
            `Producto ${i.productId} no pertenece a este restaurante`,
          );
        }

        itemsData.push({
          productId: i.productId,
          customName: null,
          quantity: i.quantity,
          priceUnit: i.priceUnit,
          subtotal: i.priceUnit * i.quantity,
        });
      } else {
        if (!i.customName) {
          throw new BadRequestException('Custom items require customName');
        }

        itemsData.push({
          productId: null,
          customName: i.customName,
          quantity: i.quantity,
          priceUnit: i.priceUnit,
          subtotal: i.priceUnit * i.quantity,
        });
      }
    }

    const total = itemsData.reduce((s, x) => s + x.subtotal, 0);

    return this.prisma.order.create({
      data: {
        restaurantId,
        userId: dto.userId ?? undefined,
        clientName: dto.clientName,
        clientPhone: dto.clientPhone,
        clientNotes: dto.clientNotes,
        total,
        status: 'ORDERED',
        type: dto.type ?? 'DELIVERY',
        tableNumber: dto.type === 'DINE_IN' ? dto.tableNumber : null,
        items: { create: itemsData },
      },
      include: {
        items: { include: { product: true } },
      },
    });
  }

  async list(restaurantId: number, from?: string, to?: string, status?: string) {
    const where: any = { restaurantId };

    if (from && to) {
      where.createdAt = {
        gte: new Date(from),
        lte: new Date(to),
      };
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(restaurantId: number, id: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, restaurantId },
      include: { items: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException(
        'Orden no encontrada o no pertenece a este restaurante',
      );
    }

    return order;
  }

  async update(restaurantId: number, id: number, dto: UpdateOrderDto) {
    const order = await this.findOne(restaurantId, id);

    if (order.status !== 'ORDERED') {
      throw new BadRequestException('Solo se pueden actualizar órdenes ORDERED');
    }

    const updateData: any = {
      clientName: dto.clientName ?? order.clientName,
      clientPhone: dto.clientPhone ?? order.clientPhone,
      clientNotes: dto.clientNotes ?? order.clientNotes,
    };

    if (dto.items) {
      const itemsData: {
        productId: number | null;
        customName: string | null;
        quantity: number;
        priceUnit: number;
        subtotal: number;
      }[] = [];

      for (const i of dto.items) {
        if (i.productId) {
          const product = await this.prisma.product.findFirst({
            where: { id: i.productId, restaurantId },
          });

          if (!product) {
            throw new NotFoundException(
              `Producto ${i.productId} no pertenece a este restaurante`,
            );
          }

          itemsData.push({
            productId: i.productId,
            customName: null,
            quantity: i.quantity,
            priceUnit: i.priceUnit,
            subtotal: i.priceUnit * i.quantity,
          });
        } else {
          if (!i.customName) {
            throw new BadRequestException('Custom items require customName');
          }

          itemsData.push({
            productId: null,
            customName: i.customName,
            quantity: i.quantity,
            priceUnit: i.priceUnit,
            subtotal: i.priceUnit * i.quantity,
          });
        }
      }

      updateData.total = itemsData.reduce((s, x) => s + x.subtotal, 0);
      updateData.items = {
        deleteMany: {},
        create: itemsData,
      };
    }

    return this.prisma.order.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true } } },
    });
  }

  async checkout(
    restaurantId: number,
    orderId: number,
    currentUserId: number,
    currentUserRole: string,
    paymentType: 'EFECTIVO' | 'TARJETA',
  ) {
    if (!paymentType || !['EFECTIVO', 'TARJETA'].includes(paymentType)) {
      throw new BadRequestException('paymentType es requerido: EFECTIVO o TARJETA');
    }

    if (currentUserRole !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede realizar ventas');
    }

    // Cargar orden con inventario incluido
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        items: {
          include: {
            product: {
              include: {
                inventoryUsage: {
                  include: { inventoryItem: true },
                },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('La orden ya fue finalizada o cancelada');
    }

    // Validar stock antes de la transacción (solo DELIVERY)
    if (order.type === 'DELIVERY') {
      for (const item of order.items) {
        if (!item.product) continue;

        for (const usage of item.product.inventoryUsage) {
          const necesidad = usage.quantity * item.quantity;

          if (usage.inventoryItem.stock < necesidad) {
            throw new BadRequestException(
              `No hay suficiente inventario de ${usage.inventoryItem.name}. ` +
              `Disponible: ${usage.inventoryItem.stock} ${usage.inventoryItem.unit}, ` +
              `necesario: ${necesidad} ${usage.inventoryItem.unit}`,
            );
          }
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const caja = await tx.caja.findFirst({
        where: { restaurantId, fechaCierre: null },
      });

      if (!caja) {
        throw new BadRequestException('No hay caja abierta.');
      }

      // Crear venta
      const sale = await tx.sale.create({
        data: {
          restaurantId,
          userId: currentUserId,
          cajaId: caja.id,
          total: order.total,
          payment: paymentType,
          items: {
            create: order.items.map((it) => ({
              productId: it.productId ?? null,
              customName: it.customName ?? null,
              quantity: it.quantity,
              priceUnit: it.priceUnit,
              subtotal: it.subtotal,
            })),
          },
        },
      });

      // Marcar orden como completada
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'COMPLETED' },
      });

      // Descontar inventario (solo DELIVERY)
      if (order.type === 'DELIVERY') {
        for (const item of order.items) {
          if (!item.product) continue;

          for (const usage of item.product.inventoryUsage) {
            const descontar = usage.quantity * item.quantity;

            await tx.inventoryItem.update({
              where: { id: usage.inventoryItemId },
              data: {
                stock: { decrement: descontar },
              },
            });
          }
        }
      }

      return sale;
    });
  }

  async cancel(
    restaurantId: number,
    id: number,
    userId: number,
    role: string,
    password: string,
  ) {
    if (role !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede cancelar órdenes');
    }

    await this.validarPassword(userId, password);

    const order = await this.findOne(restaurantId, id);

    if (order.status !== 'ORDERED') {
      throw new BadRequestException('Solo se pueden cancelar órdenes ORDERED');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async updateStatus(
    restaurantId: number,
    id: number,
    newStatus: 'ORDERED' | 'PREPARATION' | 'DELIVERY',
  ) {
    const order = await this.findOne(restaurantId, id);

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('No se puede modificar una orden finalizada');
    }

    const allowedTransitions = {
      ORDERED: ['PREPARATION'],
      PREPARATION: ['DELIVERY', 'ORDERED'],
      DELIVERY: ['PREPARATION'],
    };

    if (!allowedTransitions[order.status]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transición no permitida de ${order.status} a ${newStatus}`,
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}