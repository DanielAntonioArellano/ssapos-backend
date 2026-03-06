// src/modules/printers/printers.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrintersService } from './printers.service';
import { CreatePrinterDto } from './dto/create-printer.dto';
import { UpdatePrinterDto } from './dto/update-printer.dto';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';

@Controller('printers')
@UseGuards(JwtAuthGuard)
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  // GET /printers
  @Get()
  findAll(@Req() req: any) {
    return this.printersService.findAll(req.user.restaurantId);
  }

  // POST /printers
  @Post()
  create(@Req() req: any, @Body() dto: CreatePrinterDto) {
    return this.printersService.create(req.user.restaurantId, dto);
  }

  // PATCH /printers/:id
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrinterDto,
  ) {
    return this.printersService.update(req.user.restaurantId, id, dto);
  }

  // DELETE /printers/:id
  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.printersService.remove(req.user.restaurantId, id);
  }

  // POST /printers/:id/test
  @Post(':id/test')
  test(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.printersService.testConnection(req.user.restaurantId, id);
  }
}