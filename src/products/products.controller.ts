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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('products')
@UseGuards(AuthGuard('jwt'))
export class ProductsController {
  constructor(private products: ProductsService) {}

  // -----------------------------------------
  // Obtener restaurantId desde JWT
  // -----------------------------------------
  private getRestaurantId(req: any): number {
    if (!req.user.restaurantId) {
      throw new ForbiddenException(
        'Superadmin no puede acceder directamente a productos',
      );
    }

    return req.user.restaurantId;
  }

  // -----------------------------------------
  // Listar productos
  // -----------------------------------------
  @Get()
  findAll(@Req() req: any) {
    const restaurantId = this.getRestaurantId(req);
    return this.products.findAll(restaurantId);
  }

  // -----------------------------------------
  // Obtener producto por ID
  // -----------------------------------------
  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.products.findOne(restaurantId, id);
  }

  // -----------------------------------------
  // Crear producto
  // -----------------------------------------
  

  @Post()
  create(@Req() req: any, @Body() dto: CreateProductDto) {
    const restaurantId = this.getRestaurantId(req);
    return this.products.create(restaurantId, dto);
  }


  // -----------------------------------------
  // Actualizar producto
  // -----------------------------------------
  @Put(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.products.update(restaurantId, id, dto);
  }

  // -----------------------------------------
  // Eliminar producto
  // -----------------------------------------
  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const restaurantId = this.getRestaurantId(req);
    return this.products.remove(restaurantId, id);
  }
}