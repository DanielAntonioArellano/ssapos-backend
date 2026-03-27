// src/printer/printer-status.controller.ts
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../src/common/jwt-auth.guard';
import { PrintGateway } from '../print/print.gateway';

@Controller('printer')
@UseGuards(JwtAuthGuard)
export class PrinterStatusController {
  constructor(private readonly printGateway: PrintGateway) {}

  @Get('status')
  getStatus(@Req() req: any) {
    const restaurantId = req.user.restaurantId;
    return {
      connected: this.printGateway.isAgentConnected(restaurantId),
      pendingJobs: this.printGateway.getPendingJobsCount(restaurantId),
    };
  }
}