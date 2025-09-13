import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { ListTimeEntriesQueryDto } from './dto/list-time-entries.dto';

@Injectable()
export class TimeTrackerService {
  constructor(private prisma: PrismaService) {}

  create(userId: string, dto: CreateTimeEntryDto) {
    return this.prisma.timeEntry.create({
      data: {
        userId,
        note: dto.note ?? null,
        recipient: dto.recipient ?? null,
        personName: dto.personName,
        supportedCountry: dto.supportedCountry,
        workingLanguage: dto.workingLanguage,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        startTimeOfDay: dto.startTimeOfDay ?? null,
        endTimeOfDay: dto.endTimeOfDay ?? null,
        tasks: dto.tasks && dto.tasks.length ? dto.tasks : undefined, // default []
        taskDescription: dto.taskDescription ?? null,
      },
    });
  }

  private buildWhere(user: { userId: string; role: string }, q: ListTimeEntriesQueryDto) {
    const where: Prisma.TimeEntryWhereInput = {};

    // Visibilidad por rol
    if (user.role === 'ADMIN') {
      if (q.createdBy) where.userId = q.createdBy;
    } else {
      // USER y FIELD_MANAGER solo ven lo propio
      where.userId = user.userId;
    }

    // Rango por startDate
    if (q.fromDate || q.toDate) {
      where.startDate = {};
      if (q.fromDate) (where.startDate as Prisma.DateTimeFilter).gte = new Date(q.fromDate);
      if (q.toDate)   (where.startDate as Prisma.DateTimeFilter).lte = new Date(q.toDate);
    }

    if (q.workingLanguage) {
      where.workingLanguage = { contains: q.workingLanguage, mode: 'insensitive' };
    }
    if (q.supportedCountry) {
      where.supportedCountry = { contains: q.supportedCountry, mode: 'insensitive' };
    }
    if (q.recipient) {
      where.recipient = { contains: q.recipient, mode: 'insensitive' };
    }
    if (q.personName) {
      where.personName = { contains: q.personName, mode: 'insensitive' };
    }

    if (q.tasks?.length) {
      where.tasks = { hasSome: q.tasks };
    } else if (q.task) {
      where.tasks = { has: q.task };
    }

    if (q.q) {
      where.OR = [
        { note: { contains: q.q, mode: 'insensitive' } },
        { recipient: { contains: q.q, mode: 'insensitive' } },
        { personName: { contains: q.q, mode: 'insensitive' } },
        { taskDescription: { contains: q.q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async listWithMeta(user: { userId: string; role: string }, q: ListTimeEntriesQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = this.buildWhere(user, q);

    const [total, data] = await Promise.all([
      this.prisma.timeEntry.count({ where }),
      this.prisma.timeEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
    ]);

    const hasMore = skip + data.length < total;
    return {
      data,
      meta: { total, page, pageSize, hasMore },
    };
  }

  // Opción simple sin meta si querés
  async listFlat(user: { userId: string; role: string }, q: ListTimeEntriesQueryDto) {
    const where = this.buildWhere(user, q);
    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }
}
