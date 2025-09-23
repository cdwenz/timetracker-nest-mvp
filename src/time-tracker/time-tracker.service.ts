import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTimeEntryDto } from "./dto/create-time-entry.dto";
import { ListTimeEntriesDto } from "./dto/list-time-entries.dto";

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

  //<<<<<<< development
  private async buildWhere(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesDto
  ) {
    const where: Prisma.TimeEntryWhereInput = {};

    // Lógica de visibilidad corregida por rol
    if (user.role === "ADMIN") {
      // ADMIN puede ver todo o filtrar por usuario específico
      if (q.createdById) where.userId = q.createdById;
    } else if (user.role === "FIELD_MANAGER") {
      // FIELD_MANAGER puede ver registros de su equipo
      if (q.myTeam === true) {
        // Opción 1: Mostrar registros de equipos donde es miembro
        const userTeams = await this.prisma.teamMember.findMany({
          where: { userId: user.userId },
          select: { teamId: true },
        });

        const teamIds = userTeams.map((tm) => tm.teamId);

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
          where: { userId: user.userId, teamId: q.teamId },
        });

        if (isMember) {
          where.teamId = q.teamId;
        } else {
          throw new Error("No tienes acceso a este equipo");
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
      //======
      //async list(args: ListArgs) {
      //   const {
      //     role, orgId, currentUserId, skip, take,
      //     dateFrom, dateTo, userId, search, supportedCountry, workingLanguage
      //   } = args;
      //
      //   // Construimos filtros en AND explícito
      //   const AND: any[] = [];
      //
      //   // Alcance por rol
      //  if (role === 'SUPER' || role === 'ADMIN') {
      //    if (orgId) AND.push({ organizationId: orgId });
      //     if (userId) AND.push({ userId });
      //    } else {
      //      AND.push({ userId: currentUserId });
      //      if (orgId) AND.push({ organizationId: orgId });
      //    }
      //
      //    // Rango de fechas sobre startDate
      //    if (dateFrom || dateTo) {
      //      const dateCond: any = {};
      //      if (dateFrom) dateCond.gte = dateFrom;
      //      if (dateTo)   dateCond.lte = dateTo; // ya es fin de día
      //      AND.push({ startDate: dateCond });
      //>>>>>>> master
    }

    // Filtros simples por campo

    
    const AND: any[] = [];
    if (q.supportedCountry) AND.push({ supportedCountry: q.supportedCountry });
    if (q.workingLanguage) AND.push({ workingLanguage: q.workingLanguage });

    // Búsqueda (OR) combinada con AND
    where.AND = AND.length ? { AND } : {};
    if (q.search) {
      AND.push({
        OR: [
          { note: { contains: q.search, mode: "insensitive" } },
          { recipient: { contains: q.search, mode: "insensitive" } },
          { personName: { contains: q.search, mode: "insensitive" } },
        ],
      });
      where.AND = where.AND ?? [];
    }

    //<<<<<<< development
    return where;
  }

  async listWithMeta(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesDto
  ) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 50;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where = await this.buildWhere(user, q);

    const [count, items] = await Promise.all([
      this.prisma.timeEntry.count({ where }),
      //=======
      // const [items, count] = await this.prisma.$transaction([
      //>>>>>>> master
      this.prisma.timeEntry.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: "desc" },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return {
      message: "OK",
      count,
      page: Math.floor(skip / take) + 1,
      pageSize: take,
      items,
    };
  }
  async findOne(id: string) {
    return this.prisma.timeEntry.findUnique({ where: { id } });
  }

  //<<<<<<< development
  // Opción simple sin meta si querés
  async listFlat(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesDto
  ) {
    const where = await this.buildWhere(user, q);

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      //=======
      //  async update(id: string, dto: UpdateTimeEntryDto) {
      //    return this.prisma.timeEntry.update({
      //      where: { id },
      //      data: {
      //      ...(dto.note ? { note: dto.note } : {}),
      //     ...(dto.startDate ? { startDate: new Date(dto.startDate) } : {}),
      //      ...(dto.endDate ? { endDate: new Date(dto.endDate) } : {}),
      //      ...(dto.tasks ? { tasks: dto.tasks } : {}),
      //     // ... resto de campos opcionales
      //    },
      //>>>>>>> master
    });
  }

  async remove(id: string) {
    return this.prisma.timeEntry.delete({ where: { id } });
  }
}
