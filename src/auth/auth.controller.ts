import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // -----------------------------------------
  // REGISTRO
  // -----------------------------------------
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      restaurantId: user.restaurantId,
      restaurant: user.restaurant ?? null, // 🔥 consistente
    };
  }

  // -----------------------------------------
  // LOGIN
  // -----------------------------------------
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateUser(dto.email, dto.password);

    const tokens = this.auth.signTokens({
      id: user.id,
      email: user.email,
      role: user.role ?? null,
      restaurantId: user.restaurantId ?? null,
      isSuperAdmin: user.isSuperAdmin,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        restaurantId: user.restaurantId,
        restaurant: user.restaurant ?? null, // 🔥 OBJETO COMPLETO
      },
      ...tokens,
    };
  }

  // -----------------------------------------
  // TOKEN TEMPORAL ADMIN RESTAURANTE
  // -----------------------------------------
  @Post('validate-admin')
  async validateAdmin(@Body() dto: LoginDto) {
    const user = await this.auth.validateUser(dto.email, dto.password);

    if (user.role !== 'ADMIN' || user.isSuperAdmin) {
      throw new UnauthorizedException(
        'Solo administradores del restaurante pueden acceder',
      );
    }

    const tempToken = this.auth.signAdminTempToken({
      id: user.id,
      email: user.email,
      role: user.role ?? null,
      restaurantId: user.restaurantId ?? null,
      isSuperAdmin: user.isSuperAdmin,
    });

    return tempToken;
  }
}