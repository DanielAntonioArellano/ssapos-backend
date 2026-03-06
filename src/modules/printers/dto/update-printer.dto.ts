// src/modules/printers/dto/update-printer.dto.ts
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
import { PrinterRoleDto } from './create-printer.dto';

export class UpdatePrinterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIP()
  ip?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsEnum(PrinterRoleDto)
  role?: PrinterRoleDto;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}