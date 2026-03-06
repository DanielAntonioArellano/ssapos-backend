// src/modules/printers/printers.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrinterService } from '../../printer/printer.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';

@Injectable()
export class PrintersService {
  constructor(
    private prisma: PrismaService,
    private printerService: PrinterService,
  ) {}

  // ── Listar todas las impresoras del restaurante ───────
  async findAll(restaurantId: number) {
    return this.prisma.printer.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Crear impresora ───────────────────────────────────
  async create(restaurantId: number, dto: CreatePrinterDto) {
    // Validar que no exista ya una impresora activa con el mismo rol
    const existing = await this.prisma.printer.findFirst({
      where: { restaurantId, role: dto.role as any, active: true },
    });

    if (existing) {
      throw new BadRequestException(
        `Ya existe una impresora activa con rol ${dto.role}. Desactívala antes de crear una nueva.`,
      );
    }

    return this.prisma.printer.create({
      data: {
        restaurantId,
        name: dto.name,
        ip: dto.ip,
        port: dto.port ?? 9100,
        role: dto.role as any,
        active: dto.active ?? true,
      },
    });
  }

  // ── Actualizar impresora ──────────────────────────────
  async update(restaurantId: number, id: number, dto: UpdatePrinterDto) {
    const printer = await this.prisma.printer.findFirst({
      where: { id, restaurantId },
    });

    if (!printer) throw new NotFoundException('Impresora no encontrada');

    // Si se cambia el rol, validar que no haya conflicto
    if (dto.role && dto.role !== printer.role) {
      const conflict = await this.prisma.printer.findFirst({
        where: {
          restaurantId,
          role: dto.role as any,
          active: true,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new BadRequestException(
          `Ya existe una impresora activa con rol ${dto.role}.`,
        );
      }
    }

    return this.prisma.printer.update({
      where: { id },
      data: {
        name:   dto.name   ?? printer.name,
        ip:     dto.ip     ?? printer.ip,
        port:   dto.port   ?? printer.port,
        role:   (dto.role  ?? printer.role) as any,
        active: dto.active ?? printer.active,
      },
    });
  }

  // ── Eliminar impresora ────────────────────────────────
  async remove(restaurantId: number, id: number) {
    const printer = await this.prisma.printer.findFirst({
      where: { id, restaurantId },
    });

    if (!printer) throw new NotFoundException('Impresora no encontrada');

    await this.prisma.printer.delete({ where: { id } });
    return { ok: true, message: 'Impresora eliminada' };
  }

  // ── Test de conexión ──────────────────────────────────
  async testConnection(restaurantId: number, id: number) {
    const printer = await this.prisma.printer.findFirst({
      where: { id, restaurantId },
    });

    if (!printer) throw new NotFoundException('Impresora no encontrada');

    const testLines = [
      '================================',
      '     PRUEBA DE CONEXION         ',
      '================================',
      `Nombre: ${printer.name}`,
      `IP:     ${printer.ip}:${printer.port}`,
      `Rol:    ${printer.role}`,
      '--------------------------------',
      '   Conexion exitosa!            ',
      '\n\n\n',
    ];

    await this.printerService.printById(restaurantId, id, testLines);
    return { ok: true, message: `Prueba enviada a ${printer.name} (${printer.ip})` };
  }
}