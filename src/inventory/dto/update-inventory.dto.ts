import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateInventoryDto {

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsString()
  unit?: string;
}