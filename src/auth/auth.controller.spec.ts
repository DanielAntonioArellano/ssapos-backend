import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.auth.register(dto);
    return user;
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateUser(dto.email, dto.password);
    const tokens = this.auth.signTokens({ id: user.id, email: user.email, role: user.role });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens };
  }
}
