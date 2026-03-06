import { IsInt, IsNumber, Min } from 'class-validator';

export class VentaItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  priceUnit: number;
}
