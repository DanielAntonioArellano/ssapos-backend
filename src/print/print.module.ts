// src/print/print.module.ts
import { Module } from '@nestjs/common';
import { PrintGateway } from './print.gateway';

@Module({
  providers: [PrintGateway],
  exports: [PrintGateway],
})
export class PrintModule {}