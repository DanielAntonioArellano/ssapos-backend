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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('Usuario no encontrado');
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new ForbiddenException('Contraseña incorrecta');
  }

  // Valida que la contraseña corresponda a cualquier admin del restaurante
  private async validarAdmin(restaurantId: number, password: string) {
    if (!password) throw new ForbiddenException('Se requiere contraseña de administrador');

    const admins = await this.prisma.user.findMany({
      where: { restaurantId, role: 'ADMIN' },
    });

    if (admins.length === 0) {
      throw new ForbiddenException('No hay administradores en este restaurante');
    }

    let authorized = false;
    for (const admin of admins) {
      const match = await bcrypt.compare(password, admin.password);
      if (match) { authorized = true; break; }
    }

    if (!authorized) {
      throw new ForbiddenException('Contraseña de administrador incorrecta');
    }
  }

  async create(restaurantId: number, dto: CreateOrderDto) {
    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, restaurantId },
      });
      if (!user) throw new ForbiddenException('Usuario no pertenece a este restaurante');
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
        if (!product) throw new NotFoundException(`Producto ${i.productId} no pertenece a este restaurante`);
        itemsData.push({ productId: i.productId, customName: null, quantity: i.quantity, priceUnit: i.priceUnit, subtotal: i.priceUnit * i.quantity });
      } else {
        if (!i.customName) throw new BadRequestException('Custom items require customName');
        itemsData.push({ productId: null, customName: i.customName, quantity: i.quantity, priceUnit: i.priceUnit, subtotal: i.priceUnit * i.quantity });
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
      include: { items: { include: { product: true } } },
    });
  }

  async list(restaurantId: number, from?: string, to?: string, status?: string, type?: string) {
    const where: any = { restaurantId };
    if (from && to) {
      where.createdAt = { gte: new Date(from), lte: new Date(to) };
    }
    if (status) where.status = status;
    if (type) where.type = type;
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
    if (!order) throw new NotFoundException('Orden no encontrada o no pertenece a este restaurante');
    return order;
  }

  async update(restaurantId: number, id: number, dto: UpdateOrderDto) {
    const order = await this.findOne(restaurantId, id);
    if (order.status !== 'ORDERED') throw new BadRequestException('Solo se pueden actualizar órdenes ORDERED');

    const updateData: any = {
      clientName: dto.clientName ?? order.clientName,
      clientPhone: dto.clientPhone ?? order.clientPhone,
      clientNotes: dto.clientNotes ?? order.clientNotes,
    };

    if (dto.items) {
      const itemsData: { productId: number | null; customName: string | null; quantity: number; priceUnit: number; subtotal: number; }[] = [];

      for (const i of dto.items) {
        if (i.productId) {
          const product = await this.prisma.product.findFirst({ where: { id: i.productId, restaurantId } });
          if (!product) throw new NotFoundException(`Producto ${i.productId} no pertenece a este restaurante`);
          itemsData.push({ productId: i.productId, customName: null, quantity: i.quantity, priceUnit: i.priceUnit, subtotal: i.priceUnit * i.quantity });
        } else {
          if (!i.customName) throw new BadRequestException('Custom items require customName');
          itemsData.push({ productId: null, customName: i.customName, quantity: i.quantity, priceUnit: i.priceUnit, subtotal: i.priceUnit * i.quantity });
        }
      }

      updateData.total = itemsData.reduce((s, x) => s + x.subtotal, 0);
      updateData.items = { deleteMany: {}, create: itemsData };
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
    tip?: number,
  ) {
    if (!paymentType || !['EFECTIVO', 'TARJETA'].includes(paymentType)) {
      throw new BadRequestException('paymentType es requerido: EFECTIVO o TARJETA');
    }

    const tipAmount = paymentType === 'TARJETA' ? (tip ?? 0) : 0;

    if (currentUserRole !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede realizar ventas');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: {
        items: {
          include: {
            product: { include: { inventoryUsage: { include: { inventoryItem: true } } } },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Orden no encontrada');
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('La orden ya fue finalizada o cancelada');
    }

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
      const caja = await tx.caja.findFirst({ where: { restaurantId, fechaCierre: null } });
      if (!caja) throw new BadRequestException('No hay caja abierta.');

      const sale = await tx.sale.create({
        data: {
          restaurantId,
          userId: currentUserId,
          cajaId: caja.id,
          orderId: order.id,
          total: order.total,
          payment: paymentType,
          tip: tipAmount,
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

      await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });

      if (order.type === 'DELIVERY') {
        for (const item of order.items) {
          if (!item.product) continue;
          for (const usage of item.product.inventoryUsage) {
            await tx.inventoryItem.update({
              where: { id: usage.inventoryItemId },
              data: { stock: { decrement: usage.quantity * item.quantity } },
            });
          }
        }
      }

      return sale;
    });
  }

  // ── CANCELAR: requiere concepto + contraseña de admin ──
  async cancel(
    restaurantId: number,
    id: number,
    adminPassword: string,
    concepto: string,
  ) {
    if (!concepto?.trim()) {
      throw new BadRequestException('El motivo de cancelación es requerido');
    }

    await this.validarAdmin(restaurantId, adminPassword);

    const order = await this.findOne(restaurantId, id);

    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
      throw new BadRequestException('La orden ya fue finalizada o cancelada');
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelConcepto: concepto.trim(),   // ← campo nuevo en modelo Order
      },
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

    const allowedTransitions: Record<string, string[]> = {
      ORDERED: ['PREPARATION'],
      PREPARATION: ['DELIVERY', 'ORDERED'],
      DELIVERY: ['PREPARATION'],
    };

    if (!allowedTransitions[order.status]?.includes(newStatus)) {
      throw new BadRequestException(`Transición no permitida de ${order.status} a ${newStatus}`);
    }

    return this.prisma.order.update({ where: { id }, data: { status: newStatus } });
  }

  async deleteOrder(restaurantId: number, orderId: number, adminPassword: string) {
    if (!adminPassword) throw new ForbiddenException('Se requiere contraseña de administrador');

    await this.validarAdmin(restaurantId, adminPassword);

    const order = await this.prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) throw new NotFoundException('Orden no encontrada');

    await this.prisma.orderItem.deleteMany({ where: { orderId } });
    await this.prisma.order.delete({ where: { id: orderId } });

    return { ok: true, message: `Orden #${orderId} eliminada correctamente` };
  }
}