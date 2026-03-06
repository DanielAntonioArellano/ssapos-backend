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

  // Mapa: restaurantId → socketId del agente
  private agents = new Map<number, string>();

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Eliminar agente si se desconecta
    for (const [restaurantId, socketId] of this.agents.entries()) {
      if (socketId === client.id) {
        this.agents.delete(restaurantId);
        this.logger.log(`Agente desconectado para restaurante ${restaurantId}`);
      }
    }
  }

  // El agente se registra con su restaurantId
  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { restaurantId: number; secret: string },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: validar secret contra BD si se desea mayor seguridad
    this.agents.set(data.restaurantId, client.id);
    this.logger.log(`Agente registrado para restaurante ${data.restaurantId}`);
    client.emit('registered', { ok: true, restaurantId: data.restaurantId });
  }

  // Emitir trabajo de impresión al agente del restaurante
  emitPrintJob(restaurantId: number, job: {
    printerIp: string;
    printerPort: number;
    lines: string[];
  }): boolean {
    const socketId = this.agents.get(restaurantId);

    if (!socketId) {
      this.logger.warn(`No hay agente conectado para restaurante ${restaurantId}`);
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
}