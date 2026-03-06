import { IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export enum OrderType {
  DELIVERY = 'DELIVERY',
  TAKEAWAY = 'TAKEAWAY',
  DINE_IN = 'DINE_IN',
}

export class CreateOrderDto {

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsOptional()
  @IsString()
  clientPhone?: string;

  @IsOptional()
  @IsString()
  clientNotes?: string;

  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @IsOptional()
  @IsInt()
  tableNumber?: number;

  @IsArray()
  items: {
    productId?: number;
    customName?: string;
    quantity: number;
    priceUnit: number;
  }[];
}