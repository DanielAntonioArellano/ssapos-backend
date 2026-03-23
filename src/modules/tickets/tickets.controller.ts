import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrintGateway } from '../../print/print.gateway';
import { PrinterService } from '../../printer/printer.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly printerService: PrinterService,
    private readonly printGateway: PrintGateway,
  ) {}

  // ── GET tickets ────────────────────────────────────

  @Get('sale/:id')
  getSaleTicket(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.getSaleTicket(req.user.restaurantId, id);
  }

  @Get('order/:id')
  getOrderTicket(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.getOrderTicket(req.user.restaurantId, id);
  }

  @Get('corte/actual')
  getCorteActual(@Req() req: any) {
    return this.ticketsService.getCorteActualTicket(req.user.restaurantId);
  }

  @Get('corte/:id')
  getCorteTicket(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.ticketsService.getCorteTicket(req.user.restaurantId, id);
  }

  // ── POST print ─────────────────────────────────────

  @Post('print/sale/:id')
  async printSale(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const restaurantId = req.user.restaurantId;
    const ticket = await this.ticketsService.getSaleTicket(restaurantId, id);
    await this.emitOrFallback(restaurantId, 'CAJA', ticket.lines);
    return { ok: true, message: 'Ticket de venta enviado a impresora' };
  }

  @Post('print/order/:id')
  async printOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const restaurantId = req.user.restaurantId;
    const ticket = await this.ticketsService.getOrderTicket(restaurantId, id);
    await this.emitOrFallback(restaurantId, 'COCINA', ticket.lines);
    return { ok: true, message: 'Ticket de orden enviado a impresora' };
  }

  @Post('print/corte/actual')
  async printCorteActual(@Req() req: any) {
    const restaurantId = req.user.restaurantId;
    const ticket = await this.ticketsService.getCorteActualTicket(restaurantId);
    await this.emitOrFallback(restaurantId, 'CAJA', ticket.lines);
    return { ok: true, message: 'Corte actual enviado a impresora' };
  }

  @Post('print/corte/:id')
  async printCorteById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const restaurantId = req.user.restaurantId;
    const ticket = await this.ticketsService.getCorteTicket(restaurantId, id);
    await this.emitOrFallback(restaurantId, 'CAJA', ticket.lines);
    return { ok: true, message: 'Corte enviado a impresora' };
  }

  // ── Cuenta parcial (división de cuenta) ────────────

  @Post('print/cuenta-parcial')
  async printCuentaParcial(
    @Req() req: any,
    @Body() body: {
      numeroCuenta: number;
      items: { name: string; quantity: number; subtotal: number }[];
      subtotal: number;
      descuento?: number;
      total: number;
      payment: string;
    },
  ) {
    const restaurantId = req.user.restaurantId;
    const lines = this.ticketsService.buildCuentaParcialLines(body);
    await this.emitOrFallback(restaurantId, 'CAJA', lines);
    return { ok: true, message: `Cuenta ${body.numeroCuenta} enviada a impresora` };
  }

  // ── Helper ─────────────────────────────────────────

  private async emitOrFallback(
    restaurantId: number,
    role: 'CAJA' | 'COCINA' | 'BARRA',
    lines: string[],
  ) {
    if (this.printGateway.isAgentConnected(restaurantId)) {
      const printer = await this.printerService.getPrinterByRole(restaurantId, role);
      if (!printer) throw new BadRequestException(`No hay impresora configurada para rol ${role}`);

      this.printGateway.emitPrintJob(restaurantId, {
        printerIp: printer.ip,
        printerPort: printer.port,
        lines,
      });
      return;
    }

    await this.printerService.printByRole(restaurantId, role, lines);
  }
}