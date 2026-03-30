// src/print/print.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface PrintJob {
  printerIp: string;
  printerPort: number;
  lines: string[];
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/print',
})
export class PrintGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PrintGateway.name);
  private agents = new Map<number, string>();

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    for (const [restaurantId, socketId] of this.agents.entries()) {
      if (socketId === client.id) {
        this.agents.delete(restaurantId);
        this.logger.log(`Agente desconectado para restaurante ${restaurantId}`);
      }
    }
  }

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { restaurantId: number; secret: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { restaurantId, secret } = data;

    if (!restaurantId || !secret) {
      client.emit('registered', { ok: false, error: 'Faltan credenciales' });
      client.disconnect();
      return;
    }

    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { agentSecret: true, active: true },
    });

    if (!restaurant || !restaurant.active) {
      client.emit('registered', { ok: false, error: 'Restaurante no encontrado o inactivo' });
      client.disconnect();
      return;
    }

    if (restaurant.agentSecret !== secret) {
      client.emit('registered', { ok: false, error: 'Secret inválido' });
      client.disconnect();
      return;
    }

    this.agents.set(restaurantId, client.id);
    this.logger.log(`Agente registrado para restaurante ${restaurantId}`);
    client.emit('registered', { ok: true, restaurantId });

    // ── Reenviar trabajos pendientes desde la BD ──
    await this.flushPendingJobs(restaurantId, client.id);
  }

  // Emitir trabajo — si agente offline, persiste en BD
  async emitPrintJob(
    restaurantId: number,
    job: PrintJob,
  ): Promise<boolean> {
    const socketId = this.agents.get(restaurantId);

    if (!socketId) {
      // Persistir en base de datos
      await this.prisma.printQueue.create({
        data: {
          restaurantId,
          printerIp: job.printerIp,
          printerPort: job.printerPort,
          lines: job.lines,
        },
      });
      this.logger.warn(
        `Agente offline para restaurante ${restaurantId}. Trabajo persistido en BD.`,
      );
      return false;
    }

    this.server.to(socketId).emit('print', job);
    this.logger.log(`Trabajo enviado a restaurante ${restaurantId}`);
    return true;
  }

  // Reenviar todos los trabajos pendientes de la BD al agente
  private async flushPendingJobs(restaurantId: number, socketId: string) {
    const pending = await this.prisma.printQueue.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'asc' },
    });

    if (pending.length === 0) return;

    this.logger.log(
      `Reenviando ${pending.length} trabajos pendientes a restaurante ${restaurantId}`,
    );

    for (const job of pending) {
      this.server.to(socketId).emit('print', {
        printerIp: job.printerIp,
        printerPort: job.printerPort,
        lines: job.lines as string[],
      });

      // Eliminar de la BD una vez enviado
      await this.prisma.printQueue.delete({ where: { id: job.id } });
    }
  }

  isAgentConnected(restaurantId: number): boolean {
    return this.agents.has(restaurantId);
  }

  async getPendingJobsCount(restaurantId: number): Promise<number> {
    return this.prisma.printQueue.count({ where: { restaurantId } });
  }
}