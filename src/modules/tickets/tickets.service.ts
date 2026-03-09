import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

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

      const subtotalReal = sale.items.reduce(
        (s, item) => s + item.priceUnit * item.quantity,
        0,
      );
      const descuento = subtotalReal - sale.total;
      const hayDescuento = descuento > 0.01;

      // Propina (campo `tip` en el modelo Sale, puede ser null/0)
      const tip: number = (sale as any).tip ?? 0;
      const hayPropina = tip > 0.001;
      const totalConPropina = sale.total + tip;

      const itemLines: string[] = [];
      for (const item of sale.items) {
        const name = item.product?.name ?? item.customName ?? 'Producto';
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
          this.alignLeftRight('Subtotal', `$${subtotalReal.toFixed(2)}`),
          ...(hayDescuento
            ? [this.alignLeftRight('Descuento', `-$${descuento.toFixed(2)}`)]
            : []),
          this.alignLeftRight('Metodo de pago', sale.payment ?? ''),
          ...(hayPropina
            ? [this.alignLeftRight('Propina (tarjeta)', `$${tip.toFixed(2)}`)]
            : []),
          this.separator(),
          this.alignLeftRight('TOTAL', `$${sale.total.toFixed(2)}`),
          ...(hayPropina
            ? [this.alignLeftRight('TOTAL + PROPINA', `$${totalConPropina.toFixed(2)}`)]
            : []),
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
        ].filter(l => l !== ''),
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

    // ── Propinas acumuladas del turno ──
    const propinasTotal = caja.ventas
      .reduce((s, v) => s + ((v as any).tip ?? 0), 0);
    const hayPropinas = propinasTotal > 0.001;

    // Separar fondo del siguiente turno del resto de salidas
    const fondo = caja.movimientos.find(
      (m) => m.tipo === 'SALIDA' && m.descripcion === 'Fondo para siguiente turno',
    );
    const entradas = caja.movimientos.filter((m) => m.tipo === 'ENTRADA');
    const salidas  = caja.movimientos.filter(
      (m) => m.tipo === 'SALIDA' && m.descripcion !== 'Fondo para siguiente turno',
    );
    const gastos = caja.gastos;

    const totalEntradas = entradas.reduce((s, m) => s + m.monto, 0);
    const totalSalidas  = salidas.reduce((s, m) => s + m.monto, 0);
    const totalGastos   = gastos.reduce((s, g) => s + g.monto, 0);
    const totalFondo    = fondo?.monto ?? 0;

    const totalFinal =
      caja.montoInicial + ventasEfectivo + totalEntradas - totalSalidas - totalGastos - totalFondo;

    // Líneas detalladas de entradas
    const entradasLines: string[] = entradas.length > 0
      ? [
          this.separatorThin(),
          this.center('ENTRADAS'),
          this.separatorThin(),
          ...entradas.map((m) =>
            this.alignLeftRight(
              `  ${m.descripcion ?? 'Sin concepto'}`,
              `$${m.monto.toFixed(2)}`,
            ),
          ),
          this.alignLeftRight('  Total entradas', `$${totalEntradas.toFixed(2)}`),
        ]
      : [this.alignLeftRight('Entradas', `$${totalEntradas.toFixed(2)}`)];

    // Líneas detalladas de salidas (excluye fondo)
    const salidasLines: string[] = salidas.length > 0
      ? [
          this.separatorThin(),
          this.center('SALIDAS'),
          this.separatorThin(),
          ...salidas.map((m) =>
            this.alignLeftRight(
              `  ${m.descripcion ?? 'Sin concepto'}`,
              `-$${m.monto.toFixed(2)}`,
            ),
          ),
          this.alignLeftRight('  Total salidas', `-$${totalSalidas.toFixed(2)}`),
        ]
      : [this.alignLeftRight('Salidas', `-$${totalSalidas.toFixed(2)}`)];

    // Líneas detalladas de gastos
    const gastosLines: string[] = gastos.length > 0
      ? [
          this.separatorThin(),
          this.center('GASTOS'),
          this.separatorThin(),
          ...gastos.map((g) =>
            this.alignLeftRight(
              `  ${g.concepto ?? 'Sin concepto'}`,
              `-$${g.monto.toFixed(2)}`,
            ),
          ),
          this.alignLeftRight('  Total gastos', `-$${totalGastos.toFixed(2)}`),
        ]
      : [this.alignLeftRight('Gastos', `-$${totalGastos.toFixed(2)}`)];

    // Línea de fondo (solo si existe)
    const fondoLines: string[] = fondo
      ? [
          this.separatorThin(),
          this.center('FONDO SIGUIENTE TURNO'),
          this.separatorThin(),
          this.alignLeftRight('  Fondo retirado', `-$${totalFondo.toFixed(2)}`),
        ]
      : [];

    // ── Bloque de propinas (solo si hay) ──
    const propinasLines: string[] = hayPropinas
      ? [
          this.separatorThin(),
          this.center('PROPINAS'),
          this.separatorThin(),
          this.alignLeftRight('  Tarjeta / Transferencia', `$${propinasTotal.toFixed(2)}`),
          this.alignLeftRight('  Total propinas', `$${propinasTotal.toFixed(2)}`),
        ]
      : [];

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
        ...entradasLines,
        ...salidasLines,
        ...gastosLines,
        ...fondoLines,
        ...propinasLines,
        this.separator(),
        this.alignLeftRight('TOTAL EN CAJA', `$${totalFinal.toFixed(2)}`),
        ...(hayPropinas
          ? [this.alignLeftRight('PROPINAS DEL TURNO', `$${propinasTotal.toFixed(2)}`)]
          : []),
        this.separator(),
        this.center('Corte generado correctamente'),
        '\n\n\n',
      ],
    };
  }
}