import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../../src/common/jwt-auth.guard';
import { UpdateOrderStatusDto } from './dto/update-status.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // ---------------------------------------------------
  // Crear orden
  // ---------------------------------------------------
  @Post()
  create(@Req() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(
      req.user.restaurantId,
      dto,
    );
  }

  // ---------------------------------------------------
  // Listar órdenes
  // ---------------------------------------------------
  @Get()
  list(
    @Req() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.list(
      req.user.restaurantId,
      from,
      to,
      status,
    );
  }

  // ---------------------------------------------------
  // Obtener una orden
  // ---------------------------------------------------
  @Get(':id')
  get(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.findOne(
      req.user.restaurantId,
      id,
    );
  }

  // ---------------------------------------------------
  // Actualizar estado
  // ---------------------------------------------------
  @Patch(':id/status')
  updateStatus(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(
      req.user.restaurantId,
      id,
      dto.status,
    );
  }

  // ---------------------------------------------------
  // Actualizar orden
  // ---------------------------------------------------
  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(
      req.user.restaurantId,
      id,
      dto,
    );
  }

  // ---------------------------------------------------
  // Cancelar orden
  // ---------------------------------------------------
  @Post(':id/cancel')
  cancel(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
  ) {
    return this.ordersService.cancel(
      req.user.restaurantId,
      id,
      req.user.userId,
      req.user.role,
      password,
    );
  }

  // ---------------------------------------------------
  // Checkout (convertir en venta)
  // ---------------------------------------------------
  @Post(':id/checkout')
  checkout(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { paymentType: 'EFECTIVO' | 'TARJETA' },
  ) {
    return this.ordersService.checkout(
      req.user.restaurantId,
      id,
      req.user.userId,
      req.user.role,
      body.paymentType,
    );
  }
}