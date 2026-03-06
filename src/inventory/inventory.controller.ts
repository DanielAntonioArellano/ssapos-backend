import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private inventory: InventoryService) {}

  private getRestaurantId(req: any): number {
    if (!req.user.restaurantId) {
      throw new ForbiddenException(
        'Superadmin no puede acceder directamente',
      );
    }
    return req.user.restaurantId;
  }

  // ---------------------------------------------------
  // Listar todos
  // ---------------------------------------------------
  @Get()
  findAll(@Req() req: any) {
    const restaurantId = this.getRestaurantId(req);
    return this.inventory.findAll(restaurantId);
  }

  // ---------------------------------------------------
  // Crear item
  // ---------------------------------------------------
  @Post()
  create(@Req() req: any, @Body() dto: CreateInventoryDto) {
    const restaurantId = this.getRestaurantId(req);
    return this.inventory.create(restaurantId, dto);
  }

  // ---------------------------------------------------
  // Actualizar item
  // ---------------------------------------------------
  @Put(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInventoryDto,
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.inventory.update(restaurantId, id, dto);
  }

  // ---------------------------------------------------
  // Eliminar item
  // ---------------------------------------------------
  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.inventory.remove(restaurantId, id);
  }

  // ---------------------------------------------------
  // Registrar movimiento (ENTRADA o SALIDA)
  // ---------------------------------------------------
  @Post(':id/movimiento')
  registrarMovimiento(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tipo: 'ENTRADA' | 'SALIDA'; cantidad: number; motivo: string },
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.inventory.registrarMovimiento(
      restaurantId,
      id,
      body.tipo,
      body.cantidad,
      body.motivo,
    );
  }

  // ---------------------------------------------------
  // Historial de movimientos
  // ---------------------------------------------------
  @Get(':id/movimientos')
  getMovimientos(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.inventory.getMovimientos(restaurantId, id);
  }
}