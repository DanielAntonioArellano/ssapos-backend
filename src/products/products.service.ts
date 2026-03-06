import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // -----------------------------------------
  // Crear producto
  // -----------------------------------------
async create(restaurantId: number, data: CreateProductDto) {
  return this.prisma.product.create({
    data: {
      restaurantId,
      name: data.name,
      barcode: data.barcode,
      priceBuy: data.priceBuy,
      priceSell: data.priceSell,
      stock: data.stock,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId, // 👈 CLAVE

      inventoryUsage: data.inventoryUsage
        ? {
            create: data.inventoryUsage.map((u) => ({
              inventoryItemId: u.inventoryItemId,
              quantity: u.quantity,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      inventoryUsage: {
        include: { inventoryItem: true },
      },
    },
  });
}

  // -----------------------------------------
  // Listar productos del restaurante
  // -----------------------------------------
  async findAll(restaurantId: number) {
    return this.prisma.product.findMany({
      where: { restaurantId },
      orderBy: { id: 'desc' },
      include: {
        category: true,
        inventoryUsage: {
          include: { inventoryItem: true },
        },
      },
    });
  }

  // -----------------------------------------
  // Obtener producto por ID (validando restaurante)
  // -----------------------------------------
  async findOne(restaurantId: number, id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, restaurantId },
      include: {
        category: true,
        inventoryUsage: {
          include: { inventoryItem: true },
        },
      },
    });

    if (!product)
      throw new NotFoundException('Producto no encontrado');

    return product;
  }

  // -----------------------------------------
  // Actualizar producto (seguro multi-tenant)
  // -----------------------------------------
  async update(
  restaurantId: number,
  id: number,
  data: UpdateProductDto,
) {
  const exists = await this.prisma.product.findFirst({
    where: { id, restaurantId },
  });

  if (!exists)
    throw new ForbiddenException(
      'No puedes modificar un producto de otro restaurante',
    );

  return this.prisma.product.update({
    where: { id },
    data: {
      name: data.name,
      barcode: data.barcode,
      priceBuy: data.priceBuy,
      priceSell: data.priceSell,
      stock: data.stock,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId, // 👈 CLAVE

      inventoryUsage: data.inventoryUsage
        ? {
            deleteMany: {},
            create: data.inventoryUsage.map((u) => ({
              inventoryItemId: u.inventoryItemId,
              quantity: u.quantity,
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      inventoryUsage: {
        include: { inventoryItem: true },
      },
    },
  });
}
  // -----------------------------------------
  // Eliminar producto
  // -----------------------------------------
  async remove(restaurantId: number, id: number) {
    const exists = await this.prisma.product.findFirst({
      where: { id, restaurantId },
    });

    if (!exists)
      throw new ForbiddenException(
        'No puedes eliminar un producto de otro restaurante',
      );

    await this.prisma.product.delete({ where: { id } });

    return { message: 'Producto eliminado correctamente' };
  }
}