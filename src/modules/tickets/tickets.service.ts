import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  // ==================================================
  // CONFIGURACIÓN 80MM — 48 caracteres por línea
  // ==================================================

  private readonly LINE_WIDTH = 48;

  private separator() {
    return '='.repeat(this.LINE_WIDTH);
  }

  private separatorThin() {
    return '-'.repeat(this.LINE_WIDTH);
  }

  private center(text: string) {
    if (!text) return '';
    if (text.length >= this.LINE_WIDTH)
      return text.slice(0, this.LINE_WIDTH);
    const spaces = Math.floor((this.LINE_WIDTH - text.length) / 2);
    return ' '.repeat(spaces) + text;
  }

  private alignLeftRight(left: string, right: string) {
    left = left ?? '';
    right = right ?? '';
    if (left.length + right.length >= this.LINE_WIDTH) {
      return (
        left.slice(0, this.LINE_WIDTH - right.length - 1) +
        ' ' +
        right
      );
    }
    const spaces = this.LINE_WIDTH - left.length - right.length;
    return left + ' '.repeat(spaces) + right;
  }

  private formatDate(date: Date) {
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ==================================================
  // TICKET DE VENTA
  // ==================================================

  async getSaleTicket(restaurantId: number, saleId: number) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, restaurantId },
        include: {
          user: true,
          items: { include: { product: true } },
          restaurant: true,
        },
      });

      if (!sale) throw new NotFoundException('Venta no encontrada');

      const folio = sale.restaurant.folioVenta;

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { folioVenta: { increment: 1 } },
      });

      const itemLines: string[] = [];

      for (const item of sale.items) {
        const name = item.product?.name ?? item.customName ?? 'Producto';
        // Línea: "  2x Nombre del producto          $99.99"
        itemLines.push(
          this.alignLeftRight(
            `  ${item.quantity}x ${name}`,
            `$${item.subtotal.toFixed(2)}`,
          ),
        );
      }

      return {
        type: 'SALE',
        width: 48,
        lines: [
          this.separator(),
          this.center(sale.restaurant.name.toUpperCase()),
          this.center(sale.restaurant.address ?? ''),
          this.center(sale.restaurant.phone ?? ''),
          this.separator(),
          this.alignLeftRight(`Folio: #${folio}`, `Cajero: ${sale.user?.name ?? ''}`),
          `Fecha: ${this.formatDate(sale.createdAt)}`,
          this.separatorThin(),
          this.center('DETALLE DE VENTA'),
          this.separatorThin(),
          ...itemLines,
          this.separatorThin(),
          this.alignLeftRight('Subtotal', `$${sale.total.toFixed(2)}`),
          this.alignLeftRight('Metodo de pago', sale.payment ?? ''),
          this.separator(),
          this.alignLeftRight('TOTAL', `$${sale.total.toFixed(2)}`),
          this.separator(),
          this.center('*** Gracias por su compra ***'),
          this.center('Conserve su ticket'),
          '\n\n\n',
        ],
      };
    });
  }

  // ==================================================
  // TICKET DE ORDEN
  // ==================================================

  async getOrderTicket(restaurantId: number, orderId: number) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, restaurantId },
        include: {
          items: { include: { product: true } },
          restaurant: true,
        },
      });

      if (!order) throw new NotFoundException('Orden no encontrada');

      const folio = order.restaurant.folioOrden;

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { folioOrden: { increment: 1 } },
      });

      const itemLines: string[] = [];

      for (const item of order.items) {
        const name = item.product?.name ?? item.customName ?? 'Producto';
        itemLines.push(
          this.alignLeftRight(
            `  ${item.quantity}x ${name}`,
            `$${item.subtotal.toFixed(2)}`,
          ),
        );
      }

      const tipoLabel = order.type === 'DINE_IN'
        ? `Mesa: ${order.tableNumber ?? '-'}`
        : order.type === 'DELIVERY'
        ? 'Delivery'
        : 'Para llevar';

      return {
        type: 'ORDER',
        width: 48,
        lines: [
          this.separator(),
          this.center('*** ORDEN DE COCINA ***'),
          this.separator(),
          this.alignLeftRight(`Folio: #${folio}`, tipoLabel),
          `Fecha: ${this.formatDate(new Date())}`,
          this.separatorThin(),
          `Cliente: ${order.clientName ?? 'Sin nombre'}`,
          `Tel:     ${order.clientPhone ?? '-'}`,
          order.clientNotes ? `Notas:   ${order.clientNotes}` : '',
          this.separatorThin(),
          this.center('PRODUCTOS'),
          this.separatorThin(),
          ...itemLines,
          this.separatorThin(),
          this.alignLeftRight('TOTAL', `$${order.total.toFixed(2)}`),
          this.separator(),
          '\n\n\n',
        ].filter(l => l !== ''), // elimina líneas vacías de notas opcionales
      };
    });
  }

  // ==================================================
  // TICKET CORTE POR ID
  // ==================================================

  async getCorteTicket(restaurantId: number, cajaId: number) {
    return this.prisma.$transaction(async (tx) => {
      const caja = await tx.caja.findFirst({
        where: { id: cajaId, restaurantId },
        include: {
          user: true,
          restaurant: true,
          ventas: true,
          gastos: true,
          movimientos: true,
        },
      });

      if (!caja) throw new NotFoundException('Caja no encontrada');

      const folio = caja.restaurant.folioCorte;

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { folioCorte: { increment: 1 } },
      });

      return this.buildCorteTicket(caja, folio);
    });
  }

  // ==================================================
  // TICKET CORTE ACTUAL
  // ==================================================

  async getCorteActualTicket(restaurantId: number) {
    return this.prisma.$transaction(async (tx) => {
      const caja = await tx.caja.findFirst({
        where: { restaurantId, fechaCierre: null },
        include: {
          user: true,
          restaurant: true,
          ventas: true,
          gastos: true,
          movimientos: true,
        },
      });

      if (!caja) throw new NotFoundException('No hay caja abierta');

      const folio = caja.restaurant.folioCorte;

      await tx.restaurant.update({
        where: { id: restaurantId },
        data: { folioCorte: { increment: 1 } },
      });

      return this.buildCorteTicket(caja, folio);
    });
  }

  // ==================================================
  // CONSTRUCTOR DE CORTE
  // ==================================================

  private buildCorteTicket(caja: any, folio: number) {
    const ventasEfectivo = caja.ventas
      .filter((v) => (v.payment ?? '').toLowerCase() === 'efectivo')
      .reduce((s, v) => s + v.total, 0);

    const ventasTarjeta = caja.ventas
      .filter((v) => (v.payment ?? '').toLowerCase() === 'tarjeta')
      .reduce((s, v) => s + v.total, 0);

    const totalVentas = ventasEfectivo + ventasTarjeta;

    const entradas = caja.movimientos
      .filter((m) => m.tipo === 'ENTRADA')
      .reduce((s, m) => s + m.monto, 0);

    const salidas = caja.movimientos
      .filter((m) => m.tipo === 'SALIDA')
      .reduce((s, m) => s + m.monto, 0);

    const gastos = caja.gastos.reduce((s, g) => s + g.monto, 0);

    const totalFinal =
      caja.montoInicial + ventasEfectivo + entradas - salidas - gastos;

    return {
      type: 'CORTE',
      width: 48,
      lines: [
        this.separator(),
        this.center(caja.restaurant.name.toUpperCase()),
        this.center('CORTE DE CAJA'),
        this.separator(),
        this.alignLeftRight(`Folio: #${folio}`, `Caja ID: ${caja.id}`),
        `Cajero:   ${caja.user.name}`,
        `Apertura: ${this.formatDate(caja.fechaApertura)}`,
        `Cierre:   ${this.formatDate(new Date())}`,
        this.separatorThin(),
        this.center('RESUMEN DE VENTAS'),
        this.separatorThin(),
        this.alignLeftRight('Fondo inicial', `$${caja.montoInicial.toFixed(2)}`),
        this.alignLeftRight(`Ventas (${caja.ventas.length})`, `$${totalVentas.toFixed(2)}`),
        this.alignLeftRight('  Efectivo', `$${ventasEfectivo.toFixed(2)}`),
        this.alignLeftRight('  Tarjeta', `$${ventasTarjeta.toFixed(2)}`),
        this.separatorThin(),
        this.center('MOVIMIENTOS'),
        this.separatorThin(),
        this.alignLeftRight('Entradas', `$${entradas.toFixed(2)}`),
        this.alignLeftRight('Salidas', `$${salidas.toFixed(2)}`),
        this.alignLeftRight('Gastos', `$${gastos.toFixed(2)}`),
        this.separator(),
        this.alignLeftRight('TOTAL EN CAJA', `$${totalFinal.toFixed(2)}`),
        this.separator(),
        this.center('Corte generado correctamente'),
        '\n\n\n',
      ],
    };
  }
}