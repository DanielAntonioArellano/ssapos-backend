import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: number, dto: CreateInventoryDto) {
    return this.prisma.inventoryItem.create({
      data: {
        restaurantId,
        name: dto.name,
        stock: dto.stock,
        unit: dto.unit,
      },
    });
  }

  async findAll(restaurantId: number) {
    return this.prisma.inventoryItem.findMany({
      where: { restaurantId },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(restaurantId: number, id: number) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
    });

    if (!item)
      throw new NotFoundException('Insumo no encontrado');

    return item;
  }

  async update(
    restaurantId: number,
    id: number,
    dto: UpdateInventoryDto,
  ) {
    const exists = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
    });

    if (!exists)
      throw new ForbiddenException(
        'No puedes modificar un insumo de otro restaurante',
      );

    return this.prisma.inventoryItem.update({
      where: { id },
      data: dto,
    });
  }

  async remove(restaurantId: number, id: number) {
    const exists = await this.prisma.inventoryItem.findFirst({
      where: { id, restaurantId },
    });

    if (!exists)
      throw new ForbiddenException(
        'No puedes eliminar un insumo de otro restaurante',
      );

    await this.prisma.inventoryItem.delete({
      where: { id },
    });

    return { message: 'Insumo eliminado correctamente' };
  }

  // ---------------------------------------------------
  // Registrar movimiento de inventario
  // ---------------------------------------------------
  async registrarMovimiento(
    restaurantId: number,
    inventoryItemId: number,
    tipo: 'ENTRADA' | 'SALIDA',
    cantidad: number,
    motivo: string,
  ) {
    const item = await this.findOne(restaurantId, inventoryItemId);

    const stockAnterior = item.stock;
    const stockNuevo =
      tipo === 'ENTRADA'
        ? stockAnterior + cantidad
        : stockAnterior - cantidad;

    if (stockNuevo < 0) {
      throw new BadRequestException(
        `Stock insuficiente. Stock actual: ${stockAnterior} ${item.unit}`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { stock: stockNuevo },
      }),
      this.prisma.inventoryMovement.create({
        data: {
          inventoryItemId,
          restaurantId,
          tipo,
          cantidad,
          motivo,
          stockAnterior,
          stockNuevo,
        },
      }),
    ]);

    return this.findOne(restaurantId, inventoryItemId);
  }

  // ---------------------------------------------------
  // Obtener historial de movimientos
  // ---------------------------------------------------
  async getMovimientos(restaurantId: number, inventoryItemId: number) {
    await this.findOne(restaurantId, inventoryItemId);

    return this.prisma.inventoryMovement.findMany({
      where: { inventoryItemId, restaurantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}