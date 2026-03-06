import { Type } from 'class-transformer';
import { ValidateNested, IsEnum, IsInt, IsOptional, IsArray, ArrayMinSize } from 'class-validator';
import { VentaItemDto } from './venta-item.dto';

export class CrearVentaDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  cajaId?: number;

  @IsEnum(['EFECTIVO', 'TARJETA'], {
    message: 'El tipo de pago debe ser EFECTIVO o TARJETA',
  })
  payment: 'EFECTIVO' | 'TARJETA';

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe haber al menos un producto en la venta' })
  @ValidateNested({ each: true })
  @Type(() => VentaItemDto)
  items: VentaItemDto[];
}