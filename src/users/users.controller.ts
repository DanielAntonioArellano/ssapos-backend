import { Body, Controller, Get, Param, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../src/common/jwt-auth.guard';  // ← ajusta la ruta si es diferente

@Controller('users')
@UseGuards(JwtAuthGuard)  // ← esto hace que req.user esté disponible
export class UsersController {
  constructor(private users: UsersService) {}

  @Post()
  create(
    @Req() req,
    @Body() dto: {
      name: string;
      email: string;
      password: string;
      role?: 'ADMIN' | 'CAJERO' | 'MESERO';
    },
  ) {
    return this.users.create({
      ...dto,
      restaurantId: req.user.restaurantId,
    });
  }

  @Get('by-restaurant')
  findByRestaurant(@Req() req) {
    return this.users.findAllByRestaurant(req.user.restaurantId);
  }

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(+id);
  }
  // POST /users/for-restaurant — solo SuperAdmin
@Post('for-restaurant')
createForRestaurant(
  @Req() req,
  @Body() dto: {
    name: string;
    email: string;
    password: string;
    role?: 'ADMIN' | 'CAJERO' | 'MESERO';
    restaurantId: number;
  },
) {
  if (!req.user.isSuperAdmin) {
    throw new ForbiddenException('Solo SuperAdmin puede usar este endpoint');
  }

  return this.users.create({
    name: dto.name,
    email: dto.email,
    password: dto.password,
    role: dto.role,
    restaurantId: dto.restaurantId,
  });
}
}