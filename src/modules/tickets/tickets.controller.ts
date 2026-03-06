import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrinterService } from '../../printer/printer.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly printerService: PrinterService,
  ) {}

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

  @Post('print/sale/:id')
  async printSale(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const ticket = await this.ticketsService.getSaleTicket(req.user.restaurantId, id);
    await this.printerService.printByRole(req.user.restaurantId, 'CAJA', ticket.lines);
    return { ok: true, message: 'Ticket de venta enviado a impresora' };
  }

  @Post('print/order/:id')
  async printOrder(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const ticket = await this.ticketsService.getOrderTicket(req.user.restaurantId, id);
    await this.printerService.printByRole(req.user.restaurantId, 'COCINA', ticket.lines);
    return { ok: true, message: 'Ticket de orden enviado a impresora' };
  }

  @Post('print/corte/actual')
  async printCorteActual(@Req() req: any) {
    const ticket = await this.ticketsService.getCorteActualTicket(req.user.restaurantId);
    await this.printerService.printByRole(req.user.restaurantId, 'CAJA', ticket.lines);
    return { ok: true, message: 'Corte actual enviado a impresora' };
  }

  @Post('print/corte/:id')
  async printCorteById(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const ticket = await this.ticketsService.getCorteTicket(req.user.restaurantId, id);
    await this.printerService.printByRole(req.user.restaurantId, 'CAJA', ticket.lines);
    return { ok: true, message: 'Corte enviado a impresora' };
  }
}