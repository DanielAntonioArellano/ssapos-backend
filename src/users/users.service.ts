import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // -----------------------------------------
  // Crear usuario
  // -----------------------------------------
  async create(data: {
    name: string;
    email: string;
    password: string;
    role?: 'ADMIN' | 'CAJERO' | 'MESERO';
    restaurantId?: number | null;
    isSuperAdmin?: boolean;
  }) {
    const hash = await bcrypt.hash(data.password, 10);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hash,
        role: data.role ?? 'CAJERO',
        restaurantId: data.restaurantId ?? null,
        isSuperAdmin: data.isSuperAdmin ?? false,
      },
      include: {
        restaurant: true,
      },
    });
  }

  // -----------------------------------------
  // Listar usuarios por restaurante
  // -----------------------------------------
  async findAllByRestaurant(restaurantId: number) {
    return this.prisma.user.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
      },
    });
  }

  // -----------------------------------------
  // Buscar por email (para login)
  // -----------------------------------------
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        restaurant: true, // 🔥 necesario para validar activo/inactivo
      },
    });
  }

  // -----------------------------------------
  // Buscar usuario por ID
  // -----------------------------------------
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        restaurant: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return user;
  }

  // -----------------------------------------
  // Obtener todos los usuarios (solo superadmin)
  // -----------------------------------------
  async findAllGlobal() {
    return this.prisma.user.findMany({
      include: {
        restaurant: true,
      },
    });
  }
  async findByEmailWithRestaurant(email: string) {
  return this.prisma.user.findUnique({
    where: { email },
    include: {
      restaurant: true,
    },
  });
}
async findAll() {
  return this.prisma.user.findMany({
    include: { restaurant: true },
  });
}
}
