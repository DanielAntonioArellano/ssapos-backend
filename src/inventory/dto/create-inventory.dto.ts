import { IsString, IsNumber } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  name: string;

  @IsNumber()
  stock: number;

  @IsString()
  unit: string;
}