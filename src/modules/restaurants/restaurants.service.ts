import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RestaurantsService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------
  // Crear restaurante (solo superadmin)
  // ---------------------------------------------
  async create(data: {
    name: string;
    slug: string;
    address?: string;
    phone?: string;
  }) {
    return this.prisma.restaurant.create({
      data: {
        name: data.name,
        slug: data.slug,
        address: data.address,
        phone: data.phone,
      },
    });
  }

  // ---------------------------------------------
  // Listar todos los restaurantes
  // ---------------------------------------------
  async findAll() {
    return this.prisma.restaurant.findMany({
      orderBy: { id: 'desc' },
    });
  }

  // ---------------------------------------------
  // Obtener restaurante por ID
  // ---------------------------------------------
  async findOne(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurante no encontrado');
    }

    return restaurant;
  }

  // ---------------------------------------------
  // Activar / Desactivar restaurante
  // ---------------------------------------------
  async setActive(id: number, active: boolean) {
    const restaurant = await this.findOne(id);

    return this.prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { active },
    });
  }
}