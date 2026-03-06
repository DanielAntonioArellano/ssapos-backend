import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(restaurantId: number, name: string) {
    return this.prisma.category.create({
      data: {
        name,
        restaurantId,
      },
    });
  }

  async findAll(restaurantId: number) {
    return this.prisma.category.findMany({
      where: { restaurantId },
      orderBy: { name: 'asc' },
    });
  }

  async delete(restaurantId: number, id: number) {
    const category = await this.prisma.category.findFirst({
      where: { id, restaurantId },
    });

    if (!category) {
      throw new ForbiddenException('Categoría no válida');
    }

    return this.prisma.category.delete({
      where: { id },
    });
  }
}