import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { GastoDto } from './dto/gasto.dto';
import { MovimientoDto } from './dto/movimiento.dto';
import { JwtAuthGuard } from '../../src/common/jwt-auth.guard';

@Controller('caja')
@UseGuards(JwtAuthGuard)
export class CajaController {
  constructor(private cajaService: CajaService) {}

  @Post('abrir')
  async abrir(@Req() req, @Body() dto: AbrirCajaDto) {
    return this.cajaService.abrirCaja(
      req.user.restaurantId,
      req.user.userId,
      req.user.role,
      dto.montoInicial,
    );
  }

  @Post('movimiento')
  async movimiento(@Req() req, @Body() dto: MovimientoDto) {
    return this.cajaService.registrarMovimiento(
      req.user.restaurantId,
      req.user.userId,
      req.user.role,
      dto.tipo,
      dto.monto,
      dto.descripcion,
      dto.password,
    );
  }

  @Post('gasto')
  async gasto(@Req() req, @Body() dto: GastoDto) {
    return this.cajaService.registrarGasto(
      req.user.restaurantId,
      req.user.role,
      req.user.userId,
      dto.concepto,
      dto.monto,
      dto.password,
    );
  }

  @Post('cerrar')
  async cerrar(
    @Req() req,
    @Body('password') password: string,
    @Body('fondoFinal') fondoFinal?: string | number,
  ) {
    // Parsear a número explícitamente — el body HTTP puede traerlo como string
    const fondo =
      fondoFinal !== undefined && fondoFinal !== null && fondoFinal !== ''
        ? parseFloat(String(fondoFinal))
        : undefined;

    return this.cajaService.cerrarCaja(
      req.user.restaurantId,
      req.user.role,
      req.user.userId,
      password,
      fondo,
    );
  }

  @Get('actual')
  async obtenerCajaActual(@Req() req) {
    return this.cajaService.obtenerCajaActual(req.user.restaurantId);
  }

  @Get()
  async listar(@Req() req) {
    return this.cajaService.listarCajas(req.user.restaurantId);
  }
}