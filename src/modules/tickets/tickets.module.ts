// src/modules/tickets/tickets.module.ts
import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrinterModule } from 'src/printer/printer.module';
import { PrintModule } from 'src/print/print.module';

@Module({
  imports: [PrismaModule, PrinterModule, PrintModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}