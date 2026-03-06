import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Post()
  create(@Req() req, @Body() body: { name: string }) {
    return this.categoriesService.create(
      req.user.restaurantId,
      body.name,
    );
  }

  @Get()
  findAll(@Req() req) {
    return this.categoriesService.findAll(
      req.user.restaurantId,
    );
  }

  @Delete(':id')
  delete(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.delete(
      req.user.restaurantId,
      id,
    );
  }
}