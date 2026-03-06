import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { PrinterModule } from 'src/printer/printer.module';

@Module({
  imports: [PrismaModule, PrinterModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}