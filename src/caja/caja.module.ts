import { Module } from '@nestjs/common';
import { CajaService } from './caja.service';
import { CajaController } from './caja.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CajaController],
  providers: [CajaService, PrismaService],
})
export class CajaModule {}
