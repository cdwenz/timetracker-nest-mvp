import { Module } from '@nestjs/common';
import { TimeTrackerController } from './time-tracker.controller';
import { TimeTrackerService } from './time-tracker.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TimeTrackerController],
  providers: [TimeTrackerService, PrismaService]
})
export class TimeTrackerModule {}
