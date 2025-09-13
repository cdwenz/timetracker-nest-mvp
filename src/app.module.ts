import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { TimeTrackerModule } from './time-tracker/time-tracker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TimeTrackerModule
  ],
  providers: [PrismaService],
})
export class AppModule {}
