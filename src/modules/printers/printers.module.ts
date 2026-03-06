// src/modules/printers/printers.module.ts
import { Module } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PrinterModule } from '../../printer/printer.module';

@Module({
  imports: [PrismaModule, PrinterModule],
  providers: [PrintersService],
  controllers: [PrintersController],
})
export class PrintersModule {}