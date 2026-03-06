import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  // ---------------------------------------------------
  // Validar usuario
  // ---------------------------------------------------
  async validateUser(email: string, pass: string) {
    const user = await this.users.findByEmailWithRestaurant(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const ok = bcrypt.compareSync(pass.trim(), user.password.trim());

    if (!ok) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isSuperAdmin) {
      if (!user.restaurantId) {
        throw new UnauthorizedException(
          'Usuario no pertenece a ningún restaurante',
        );
      }

      if (!user.restaurant || !user.restaurant.active) {
        throw new UnauthorizedException('Restaurante inactivo');
      }
    }

    return user;
  }

  // ---------------------------------------------------
  // Registro
  // ---------------------------------------------------
  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    restaurantId?: number;
    isSuperAdmin?: boolean;
  }) {
    const passwordClean = data.password.trim();

    const allowedRoles = ['ADMIN', 'CAJERO', 'MESERO'] as const;

    let roleValidated:
      | 'ADMIN'
      | 'CAJERO'
      | 'MESERO'
      | undefined = undefined;

    if (data.role && allowedRoles.includes(data.role as any)) {
      roleValidated = data.role as any;
    }

    const created = await this.users.create({
      name: data.name,
      email: data.email,
      password: passwordClean,
      role: roleValidated,
      restaurantId: data.isSuperAdmin ? null : data.restaurantId,
      isSuperAdmin: data.isSuperAdmin ?? false,
    });

    return created;
  }

  // ---------------------------------------------------
  // Tokens
  // ---------------------------------------------------
  signTokens(user: {
    id: number;
    email: string;
    role: string | null;
    restaurantId: number | null;
    isSuperAdmin: boolean;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.cfg.get<string>('JWT_SECRET') ?? 'defaultSecret',
      expiresIn: parseInt(
        this.cfg.get<string>('JWT_EXPIRES_IN') ?? '3600',
        10,
      ),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret:
        this.cfg.get<string>('JWT_REFRESH_SECRET') ??
        'defaultRefreshSecret',
      expiresIn: parseInt(
        this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          (7 * 24 * 3600).toString(),
        10,
      ),
    });

    return { accessToken, refreshToken };
  }

  // ---------------------------------------------------
  // Token temporal admin restaurante
  // ---------------------------------------------------
  signAdminTempToken(
    user: {
      id: number;
      email: string;
      role: string | null;
      restaurantId: number | null;
      isSuperAdmin: boolean;
    },
    expiresInSeconds = 300,
  ) {
    if (user.role !== 'ADMIN' || user.isSuperAdmin) {
      throw new UnauthorizedException(
        'Solo administradores del restaurante pueden obtener token temporal',
      );
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = this.jwt.sign(payload, {
      secret: this.cfg.get<string>('JWT_SECRET') ?? 'defaultSecret',
      expiresIn: expiresInSeconds,
    });

    return { accessToken, expiresIn: expiresInSeconds };
  }
}