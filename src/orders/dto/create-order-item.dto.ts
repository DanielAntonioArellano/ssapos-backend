import { IsInt, Min, IsNumber } from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  priceUnit: number;
}
