// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthModule } from './auth/auth.module';

// Guards globales
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermsGuard } from './auth/guards/perms.guard';
import { PrismaModule } from './prisma/prisma.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { RegionsModule } from './regions/regions.module';
import { TeamsModule } from './teams/teams.module';
import { TimeTrackerModule } from './time-tracker/time-tracker.module';

@Module({
  imports: [
    PrismaModule,
    // Variables de entorno disponibles en toda la app
    ConfigModule.forRoot({ isGlobal: true }),

    // JWT (si preferís usar Async con ConfigService, también va)
    JwtModule.register({
      // secret solo para fallback local; en prod levantalo de env (JWT_SECRET)
      secret: process.env.JWT_SECRET || 'dev_secret_change_me',
      signOptions: { expiresIn: process.env.JWT_EXPIRES || '15m' },
      global: true,
    }),

    AuthModule,
    OrganizationsModule,
    RegionsModule,
    TeamsModule,
    TimeTrackerModule
  ],
  providers: [
    // Orden IMPORTA:
    // 1) JwtAuthGuard debe correr primero para poblar req.user
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2) Luego RolesGuard (usa req.user.role)
    { provide: APP_GUARD, useClass: RolesGuard },
    // 3) Por último PermsGuard (usa req.user.permissions)
    { provide: APP_GUARD, useClass: PermsGuard },
  ],
})
export class AppModule {}
