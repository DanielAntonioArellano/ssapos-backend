import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CajaService {
  constructor(private prisma: PrismaService) {}

  private async validarPassword(userId: number, password: string) {
    if (!password) {
      throw new ForbiddenException('Se requiere contraseña');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('Usuario no encontrado');
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      throw new ForbiddenException('Contraseña incorrecta');
    }
  }

  async abrirCaja(
    restaurantId: number,
    userId: number,
    userRole: string,
    montoInicial: number,
  ) {
    if (userRole !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede abrir caja');
    }

    const abierta = await this.prisma.caja.findFirst({
      where: { restaurantId, fechaCierre: null },
    });

    if (abierta) {
      throw new BadRequestException('Ya existe una caja abierta en este restaurante');
    }

    return this.prisma.caja.create({
      data: { userId, montoInicial, restaurantId },
    });
  }

  async obtenerCajaActual(restaurantId: number) {
    return this.prisma.caja.findFirst({
      where: { restaurantId, fechaCierre: null },
      include: {
        ventas: { include: { items: true } },
        gastos: true,
        movimientos: true,
        user: true,
      },
    });
  }

  async registrarMovimiento(
    restaurantId: number,
    userId: number,
    userRole: string,
    tipo: string,
    monto: number,
    descripcion: string | undefined,
    password: string,
  ) {
    if (userRole !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede registrar movimientos');
    }

    await this.validarPassword(userId, password);

    const caja = await this.obtenerCajaActual(restaurantId);

    if (!caja) {
      throw new BadRequestException('No hay una caja abierta');
    }

    return this.prisma.movimiento.create({
      data: {
        tipo,
        monto,
        descripcion: descripcion ?? null,
        userId,
        cajaId: caja.id,
        restaurantId,
      },
    });
  }

  async registrarGasto(
    restaurantId: number,
    userRole: string,
    userId: number,
    concepto: string,
    monto: number,
    password: string,
  ) {
    if (userRole !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede registrar gastos');
    }

    await this.validarPassword(userId, password);

    const caja = await this.obtenerCajaActual(restaurantId);

    if (!caja) {
      throw new BadRequestException('No hay caja abierta');
    }

    return this.prisma.gasto.create({
      data: { cajaId: caja.id, concepto, monto },
    });
  }

  async cerrarCaja(
    restaurantId: number,
    userRole: string,
    userId: number,
    password: string,
    fondoFinal?: number,
  ) {
    if (userRole !== 'CAJERO') {
      throw new ForbiddenException('Solo el usuario CAJERO puede cerrar caja');
    }

    await this.validarPassword(userId, password);

    const caja = await this.prisma.caja.findFirst({
      where: { restaurantId, fechaCierre: null },
      include: {
        ventas: true,
        gastos: true,
        movimientos: true,
      },
    });

    if (!caja) {
      throw new BadRequestException('No hay caja abierta');
    }

    // Validar órdenes pendientes
    const ordenesPendientes = await this.prisma.order.count({
      where: {
        restaurantId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    });

    if (ordenesPendientes > 0) {
      throw new BadRequestException(
        `Hay ${ordenesPendientes} orden(es) pendientes. Complétalas o cancélalas antes de cerrar.`,
      );
    }

    // Si se indicó fondo final, registrarlo como SALIDA antes de calcular totales
    if (fondoFinal && fondoFinal > 0) {
      await this.prisma.movimiento.create({
        data: {
          tipo: 'SALIDA',
          monto: fondoFinal,
          descripcion: 'Fondo para siguiente turno',
          userId,
          cajaId: caja.id,
          restaurantId,
        },
      });

      // Recargar movimientos con el fondo ya incluido
      const movimientosActualizados = await this.prisma.movimiento.findMany({
        where: { cajaId: caja.id },
      });
      caja.movimientos = movimientosActualizados;
    }

    let efectivo = 0;
    let tarjeta = 0;

    for (const venta of caja.ventas) {
      const p = (venta.payment ?? '').toLowerCase();
      if (p === 'efectivo') efectivo += venta.total;
      else tarjeta += venta.total;
    }

    const gastos = caja.gastos.reduce((s, g) => s + g.monto, 0);
    const entradas = caja.movimientos
      .filter((m) => m.tipo === 'ENTRADA')
      .reduce((s, m) => s + m.monto, 0);
    const salidas = caja.movimientos
      .filter((m) => m.tipo === 'SALIDA')
      .reduce((s, m) => s + m.monto, 0);

    const totalGeneral = caja.montoInicial + efectivo + entradas - gastos - salidas;

    return this.prisma.caja.update({
      where: { id: caja.id },
      data: {
        fechaCierre: new Date(),
        totalEfectivo: efectivo,
        totalTarjeta: tarjeta,
        totalGeneral,
      },
      include: {
        ventas: true,
        movimientos: true,
        gastos: true,
      },
    });
  }

  async listarCajas(restaurantId: number) {
    return this.prisma.caja.findMany({
      where: { restaurantId },
      include: {
        ventas: true,
        gastos: true,
        movimientos: true,
      },
      orderBy: { fechaApertura: 'desc' },
    });
  }
}