import { IsString, IsNumber, IsOptional } from 'class-validator';

export class MovimientoDto {
  @IsString()
  tipo: string;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  password: string; // 🔐 requerido para seguridad
}