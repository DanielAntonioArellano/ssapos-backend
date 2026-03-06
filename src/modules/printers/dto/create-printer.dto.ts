// src/modules/printers/dto/create-printer.dto.ts
import {
  IsString,
  IsIP,
  IsInt,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export enum PrinterRoleDto {
  CAJA   = 'CAJA',
  COCINA = 'COCINA',
  BARRA  = 'BARRA',
}

export class CreatePrinterDto {
  @IsString()
  name: string;

  @IsIP()
  ip: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsEnum(PrinterRoleDto)
  role: PrinterRoleDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}