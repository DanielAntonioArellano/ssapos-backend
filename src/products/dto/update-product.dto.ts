import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class InventoryUsageItemDto {
  @IsInt()
  inventoryItemId: number;

  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  priceBuy?: number;

  @IsOptional()
  @IsNumber()
  priceSell?: number;

  @IsOptional()
  @IsInt()
  stock?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  categoryId?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  /** insumos asignados para inventario */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryUsageItemDto)
  inventoryUsage?: InventoryUsageItemDto[];
}
