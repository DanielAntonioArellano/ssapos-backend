import { IsEnum } from 'class-validator';

export enum OrderStatus {
  ORDERED = 'ORDERED',
  PREPARATION = 'PREPARATION',
  DELIVERY = 'DELIVERY',
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}