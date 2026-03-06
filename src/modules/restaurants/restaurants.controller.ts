import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('restaurants')
@UseGuards(JwtAuthGuard)
export class RestaurantsController {
  constructor(private restaurantsService: RestaurantsService) {}

  // -------------------------------------------------
  // Verificar que sea superadmin
  // -------------------------------------------------
  private validateSuperAdmin(req: any) {
    if (!req.user.isSuperAdmin) {
      throw new ForbiddenException(
        'Solo superadmin puede gestionar restaurantes',
      );
    }
  }

  // -------------------------------------------------
  // Crear restaurante
  // -------------------------------------------------
  @Post()
  create(@Req() req, @Body() body: any) {
    this.validateSuperAdmin(req);
    return this.restaurantsService.create(body);
  }

  // -------------------------------------------------
  // Listar restaurantes
  // -------------------------------------------------
  @Get()
  findAll(@Req() req) {
    this.validateSuperAdmin(req);
    return this.restaurantsService.findAll();
  }

  // -------------------------------------------------
  // Activar restaurante
  // -------------------------------------------------
  @Patch(':id/activate')
  activate(@Req() req, @Param('id', ParseIntPipe) id: number) {
    this.validateSuperAdmin(req);
    return this.restaurantsService.setActive(id, true);
  }

  // -------------------------------------------------
  // Desactivar restaurante
  // -------------------------------------------------
  @Patch(':id/deactivate')
  deactivate(@Req() req, @Param('id', ParseIntPipe) id: number) {
    this.validateSuperAdmin(req);
    return this.restaurantsService.setActive(id, false);
  }
}