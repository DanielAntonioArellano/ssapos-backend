import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { JwtAuthGuard } from '../../src/common/jwt-auth.guard';

@Controller('ventas')
@UseGuards(JwtAuthGuard)
export class VentasController {
  constructor(private ventasService: VentasService) {}

  // ---------------------------------------------------
  // Crear venta
  // ---------------------------------------------------
  @Post()
  async crear(@Req() req, @Body() body: CrearVentaDto) {
    const restaurantId = req.user.restaurantId;

    return this.ventasService.crearVenta(restaurantId, body);
  }

  // ---------------------------------------------------
  // Listar ventas del restaurante
  // ---------------------------------------------------
  @Get()
  async listar(@Req() req) {
    const restaurantId = req.user.restaurantId;

    return this.ventasService.listarVentas(restaurantId);
  }

  // ---------------------------------------------------
  // Detalle de venta
  // ---------------------------------------------------
  @Get(':id')
  async detalle(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const restaurantId = req.user.restaurantId;

    return this.ventasService.detalleVenta(restaurantId, id);
  }
}