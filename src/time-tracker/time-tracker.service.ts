import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTimeEntryDto } from "./dto/create-time-entry.dto";
import { UpdateTimeEntryDto } from "./dto/update-time-entry.dto";

type ListArgs = {
  role: string;
  orgId?: string;
  currentUserId: string;
  skip: number;
  take: number;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  search?: string;
  supportedCountry?: string;
  workingLanguage?: string;
};

@Injectable()
export class TimeTrackerService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, orgId: string, dto: CreateTimeEntryDto) {
    return this.prisma.timeEntry.create({
      data: {
        // Relaciones obligatorias
        user: { connect: { id: userId } },
        organization: { connect: { id: orgId } },

        // Escalares
        note: dto.note,
        recipient: dto.recipient,
        personName: dto.personName,
        supportedCountry: dto.supportedCountry,
        workingLanguage: dto.workingLanguage,
        startDate: new Date(dto.startDate), // dto viene string ISO → Date
        endDate: new Date(dto.endDate),
        startTimeOfDay: dto.startTimeOfDay,
        endTimeOfDay: dto.endTimeOfDay,
        taskDescription: dto.taskDescription,
        tasks: dto.tasks ?? [], // String[]
      },
    });
  }

 async list(args: ListArgs) {
    const {
      role, orgId, currentUserId, skip, take,
      dateFrom, dateTo, userId, search, supportedCountry, workingLanguage
    } = args;

    // Construimos filtros en AND explícito
    const AND: any[] = [];

    // Alcance por rol
    if (role === 'SUPER' || role === 'ADMIN') {
      if (orgId) AND.push({ organizationId: orgId });
      if (userId) AND.push({ userId });
    } else {
      AND.push({ userId: currentUserId });
      if (orgId) AND.push({ organizationId: orgId });
    }

    // Rango de fechas sobre startDate
    if (dateFrom || dateTo) {
      const dateCond: any = {};
      if (dateFrom) dateCond.gte = dateFrom;
      if (dateTo)   dateCond.lte = dateTo; // ya es fin de día
      AND.push({ startDate: dateCond });
    }

    // Filtros simples por campo
    if (supportedCountry) AND.push({ supportedCountry });
    if (workingLanguage) AND.push({ workingLanguage });

    // Búsqueda (OR) combinada con AND
    const where: any = AND.length ? { AND } : {};
    if (search) {
      where.AND = where.AND ?? [];
      where.AND.push({
        OR: [
          { note: { contains: search, mode: 'insensitive' } },
          { recipient: { contains: search, mode: 'insensitive' } },
          { personName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const [items, count] = await this.prisma.$transaction([
      this.prisma.timeEntry.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return {
      message: 'OK',
      count,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      items,
    };
  }
    async findOne(id: string) {
    return this.prisma.timeEntry.findUnique({ where: { id } });
  }

  async update(id: string, dto: UpdateTimeEntryDto) {
    return this.prisma.timeEntry.update({
      where: { id },
      data: {
      ...(dto.note ? { note: dto.note } : {}),
      ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
      ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      ...(dto.tasks ? { tasks: dto.tasks } : {}),
      // ... resto de campos opcionales
    },
    });
  }

  async remove(id: string) {
    return this.prisma.timeEntry.delete({ where: { id } });
  }
}
