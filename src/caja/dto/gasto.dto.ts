import { IsString, IsNumber } from 'class-validator';

export class GastoDto {
  @IsString()
  concepto: string;

  @IsNumber()
  monto: number;

  @IsString()
  password: string; // 🔐 requerido para seguridad
}