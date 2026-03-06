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

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsNumber()
  priceBuy: number;

  @IsNumber()
  priceSell: number;

  @IsInt()
  stock: number;

  // 👇 ÚNICO campo válido
  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryUsageItemDto)
  inventoryUsage?: InventoryUsageItemDto[];
}