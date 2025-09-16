import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTimeEntryDto } from "./dto/create-time-entry.dto";
import { ListTimeEntriesQueryDto } from "./dto/list-time-entries.dto";

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

  private async buildWhere(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesQueryDto
  ) {
    const where: Prisma.TimeEntryWhereInput = {};

    // Lógica de visibilidad corregida por rol
    if (user.role === "ADMIN") {
      // ADMIN puede ver todo o filtrar por usuario específico
      if (q.createdBy) where.userId = q.createdBy;
    } else if (user.role === "FIELD_MANAGER") {
      // FIELD_MANAGER puede ver registros de su equipo
      if (q.myTeam === true) {
        // Opción 1: Mostrar registros de equipos donde es miembro
        const userTeams = await this.prisma.teamMember.findMany({
          where: { userId: user.userId },
          select: { teamId: true }
        });
        
        const teamIds = userTeams.map(tm => tm.teamId);
        
        if (teamIds.length > 0) {
          where.OR = [
            { userId: user.userId }, // Mis propios registros
            { teamId: { in: teamIds } }, // Registros de mis equipos
          ];
        } else {
          // No pertenezco a ningún equipo, solo mis registros
          where.userId = user.userId;
        }
      } else {
        // Solo mis registros personales
        where.userId = user.userId;
      }
    } else {
      // USER solo ve sus propios registros
      where.userId = user.userId;
    }

    // Filtro por equipo específico
    if (q.teamId) {
      // Verificar que el usuario tenga acceso a este equipo
      if (user.role === "ADMIN") {
        where.teamId = q.teamId;
      } else {
        const isMember = await this.prisma.teamMember.findFirst({
          where: { userId: user.userId, teamId: q.teamId }
        });
        
        if (isMember) {
          where.teamId = q.teamId;
        } else {
          throw new Error('No tienes acceso a este equipo');
        }
      }
    }

    // Rango por startDate
    if (q.fromDate || q.toDate) {
      where.startDate = {};
      if (q.fromDate)
        (where.startDate as Prisma.DateTimeFilter).gte = new Date(q.fromDate);
      if (q.toDate)
        (where.startDate as Prisma.DateTimeFilter).lte = new Date(q.toDate);
    }

    if (q.workingLanguage) {
      where.workingLanguage = {
        contains: q.workingLanguage,
        mode: "insensitive",
      };
    }
    if (q.supportedCountry) {
      where.supportedCountry = {
        contains: q.supportedCountry,
        mode: "insensitive",
      };
    }
    if (q.recipient) {
      where.recipient = { contains: q.recipient, mode: "insensitive" };
    }
    if (q.personName) {
      where.personName = { contains: q.personName, mode: "insensitive" };
    }

    if (q.tasks?.length) {
      where.tasks = { hasSome: q.tasks };
    } else if (q.task) {
      where.tasks = { has: q.task };
    }

    if (q.q) {
      where.OR = [
        { note: { contains: q.q, mode: "insensitive" } },
        { recipient: { contains: q.q, mode: "insensitive" } },
        { personName: { contains: q.q, mode: "insensitive" } },
        { taskDescription: { contains: q.q, mode: "insensitive" } },
      ];
    }

    return where;
  }

  async listWithMeta(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesQueryDto
  ) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = await this.buildWhere(user, q);

    const [total, data] = await Promise.all([
      this.prisma.timeEntry.count({ where }),
      this.prisma.timeEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
  async listFlat(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesQueryDto
  ) {
    const where = await this.buildWhere(user, q);
    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}
