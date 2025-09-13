import { INestApplication, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Opcional: si querés cerrar la app ordenadamente cuando el proceso termina
  enableShutdownHooks(app: INestApplication) {
    // En Nest 10+ esto registra señales SIGINT/SIGTERM
    app.enableShutdownHooks();
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
