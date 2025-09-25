import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { RegionalAnalyticsService } from './services/regional-analytics.service';
import { ExportService } from './services/export.service';
import { ReportsGuard } from './guards/reports.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [
    RegionalAnalyticsService,
    ExportService,
    ReportsGuard
  ],
  exports: [
    RegionalAnalyticsService,
    ExportService,
    ReportsGuard
  ]
})
export class ReportsModule {}