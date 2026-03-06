// src/printer/printer.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as net from 'net';

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(private prisma: PrismaService) {}

  // ── Comandos ESC/POS ──────────────────────────────────
  private readonly INIT         = Buffer.from([0x1b, 0x40]);
  private readonly CUT          = Buffer.from([0x1d, 0x56, 0x41, 0x03]);
  private readonly ALIGN_LEFT   = Buffer.from([0x1b, 0x61, 0x00]);

  // ── Imprimir por rol (busca IP en BD) ─────────────────
  async printByRole(
    restaurantId: number,
    role: 'CAJA' | 'COCINA' | 'BARRA',
    lines: string[],
  ): Promise<void> {
    const printer = await this.prisma.printer.findFirst({
      where: { restaurantId, role, active: true },
    });

    if (!printer) {
      throw new NotFoundException(
        `No hay impresora activa con rol ${role} configurada`,
      );
    }

    const data = this.buildBuffer(lines);
    await this.sendToPrinter(data, printer.ip, printer.port);
  }

  // ── Imprimir por ID directo (para test de conexión) ───
  async printById(
    restaurantId: number,
    printerId: number,
    lines: string[],
  ): Promise<void> {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, restaurantId },
    });

    if (!printer) {
      throw new NotFoundException('Impresora no encontrada');
    }

    const data = this.buildBuffer(lines);
    await this.sendToPrinter(data, printer.ip, printer.port);
  }

  // ── printLines legacy (fallback a .env si no hay BD) ──
  async printLines(lines: string[]): Promise<void> {
    const host = process.env.PRINTER_IP ?? '192.168.1.100';
    const port = parseInt(process.env.PRINTER_PORT ?? '9100', 10);
    const data = this.buildBuffer(lines);
    await this.sendToPrinter(data, host, port);
  }

  // ── Construir buffer ESC/POS ──────────────────────────
  private buildBuffer(lines: string[]): Buffer {
    const chunks: Buffer[] = [this.INIT, this.ALIGN_LEFT];

    for (const line of lines) {
      if (line === '\n\n\n') {
        chunks.push(Buffer.from([0x0a, 0x0a, 0x0a, 0x0a]));
        chunks.push(this.CUT);
        continue;
      }
      chunks.push(Buffer.from(line + '\n', 'utf8'));
    }

    return Buffer.concat(chunks);
  }

  // ── Envío TCP ─────────────────────────────────────────
  private sendToPrinter(
    data: Buffer,
    host: string,
    port: number,
  ): Promise<void> {
    const timeout = 5000;

    return new Promise((resolve, reject) => {
      const client = new net.Socket();

      client.setTimeout(timeout);

      client.connect(port, host, () => {
        this.logger.log(`Conectado a impresora ${host}:${port}`);
        client.write(data, (err) => {
          if (err) {
            client.destroy();
            return reject(new Error(`Error al escribir: ${err.message}`));
          }
          setTimeout(() => {
            client.destroy();
            resolve();
          }, 200);
        });
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error(`Timeout conectando a impresora ${host}:${port}`));
      });

      client.on('error', (err) => {
        client.destroy();
        reject(new Error(`Error de conexión: ${err.message}`));
      });
    });
  }
}