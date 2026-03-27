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
  enqueuedAt: Date;
  attempts: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/print',
})
export class PrintGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PrintGateway.name);

  // Mapa: restaurantId → socketId del agente autenticado
  private agents = new Map<number, string>();

  // Cola de trabajos pendientes por restaurante (cuando agente está offline)
  private pendingJobs = new Map<number, PrintJob[]>();

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

  // El agente se registra con su restaurantId y secret
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

    // ── Validar secret contra BD ──
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { agentSecret: true, active: true },
    });

    if (!restaurant || !restaurant.active) {
      client.emit('registered', { ok: false, error: 'Restaurante no encontrado o inactivo' });
      client.disconnect();
      this.logger.warn(`Intento de registro con restaurante inválido: ${restaurantId}`);
      return;
    }

    if (restaurant.agentSecret !== secret) {
      client.emit('registered', { ok: false, error: 'Secret inválido' });
      client.disconnect();
      this.logger.warn(`Secret inválido para restaurante ${restaurantId} desde ${client.handshake.address}`);
      return;
    }

    // Registrar agente
    this.agents.set(restaurantId, client.id);
    this.logger.log(`Agente autenticado para restaurante ${restaurantId}`);
    client.emit('registered', { ok: true, restaurantId });

    // ── Reenviar trabajos pendientes en cola ──
    const pending = this.pendingJobs.get(restaurantId);
    if (pending && pending.length > 0) {
      this.logger.log(`Reenviando ${pending.length} trabajos pendientes a restaurante ${restaurantId}`);
      for (const job of pending) {
        this.server.to(client.id).emit('print', {
          printerIp: job.printerIp,
          printerPort: job.printerPort,
          lines: job.lines,
        });
      }
      this.pendingJobs.delete(restaurantId);
    }
  }

  // Emitir trabajo de impresión — encola si el agente está offline
  emitPrintJob(
    restaurantId: number,
    job: { printerIp: string; printerPort: number; lines: string[] },
  ): boolean {
    const socketId = this.agents.get(restaurantId);

    if (!socketId) {
      // Agregar a cola de pendientes
      const queue = this.pendingJobs.get(restaurantId) ?? [];
      queue.push({ ...job, enqueuedAt: new Date(), attempts: 0 });
      this.pendingJobs.set(restaurantId, queue);
      this.logger.warn(
        `Agente offline para restaurante ${restaurantId}. Trabajo encolado (${queue.length} pendientes)`,
      );
      return false;
    }

    this.server.to(socketId).emit('print', job);
    this.logger.log(`Trabajo de impresión enviado a restaurante ${restaurantId}`);
    return true;
  }

  // Verificar si hay agente conectado
  isAgentConnected(restaurantId: number): boolean {
    return this.agents.has(restaurantId);
  }

  // Cantidad de trabajos pendientes en cola
  getPendingJobsCount(restaurantId: number): number {
    return this.pendingJobs.get(restaurantId)?.length ?? 0;
  }

  // Limpiar cola manualmente (por si se necesita desde un endpoint)
  clearPendingJobs(restaurantId: number): void {
    this.pendingJobs.delete(restaurantId);
    this.logger.log(`Cola de impresión limpiada para restaurante ${restaurantId}`);
  }
}