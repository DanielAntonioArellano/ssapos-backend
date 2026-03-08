import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Delete,
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

  @Post()
  create(@Req() req, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.restaurantId, dto);
  }

  @Get()
  list(
    @Req() req,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.ordersService.list(req.user.restaurantId, from, to, status);
  }

  @Get(':id')
  get(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(req.user.restaurantId, id);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(req.user.restaurantId, id, dto.status);
  }

  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(req.user.restaurantId, id, dto);
  }

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

  // ---------------------------------------------------
  // Eliminar orden (requiere contraseña de admin)
  // ---------------------------------------------------
  @Delete(':id')
  deleteOrder(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('adminPassword') adminPassword: string,
  ) {
    return this.ordersService.deleteOrder(
      req.user.restaurantId,
      id,
      adminPassword,
    );
  }
}