import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsIn,
  IsInt,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsIn(['ADMIN', 'CAJERO', 'INVENTARIO'])
  role?: 'ADMIN' | 'CAJERO' | 'INVENTARIO';

  @IsOptional()
  @IsInt()
  restaurantId?: number;
}