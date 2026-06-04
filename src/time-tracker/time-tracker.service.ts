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
  constructor(private prisma: PrismaService) { }

  async create(userId: string, orgId: string, dto: CreateTimeEntryDto) {
    const membership = await this.prisma.teamMember.findFirst({
      where: {
        userId,
      },
      include: {
        team: true,
      },
    });

    console.log("USER:", userId);
    console.log("MEMBERSHIP:", membership);
    console.log("TEAM:", membership?.teamId);
    console.log("REGION:", membership?.team?.regionId);

    return this.prisma.timeEntry.create({
      data: {
        user: {
          connect: { id: userId },
        },

        organization: {
          connect: { id: orgId },
        },

        ...(membership?.teamId && {
          team: {
            connect: {
              id: membership.teamId,
            },
          },
        }),

        ...(membership?.team?.regionId && {
          region: {
            connect: {
              id: membership.team.regionId,
            },
          },
        }),

        note: dto.note,
        recipient: dto.recipient,
        personName: dto.personName,
        supportedCountry: dto.supportedCountry,
        workingLanguage: dto.workingLanguage,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        startTimeOfDay: dto.startTimeOfDay,
        endTimeOfDay: dto.endTimeOfDay,
        taskDescription: dto.taskDescription,
        tasks: dto.tasks ?? [],
      },
    });
  }

  private async buildWhere(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesDto
  ) {
    const where: Prisma.TimeEntryWhereInput = {};

    // Lógica de visibilidad corregida por rol
    if (user.role === "ADMIN") {
      if (q.createdById) {
        where.userId = q.createdById;
      }
    }
    else if (user.role === "REGIONAL_MANAGER") {
      if (q.myTeam === true) {
        const regions = await this.prisma.region.findMany({
          where: {
            managerId: user.userId,
          },
          select: {
            id: true,
          },
        });

        const regionIds = regions.map((r) => r.id);

        where.OR = [
          {
            userId: user.userId,
          },
          {
            regionId: {
              in: regionIds,
            },
          },
        ];
      } else {
        where.userId = user.userId;
      }
    }

    else if (user.role === "FIELD_MANAGER") {
      if (q.myTeam === true) {
        const teams = await this.prisma.team.findMany({
          where: {
            managerId: user.userId,
          },
          select: {
            id: true,
          },
        });

        const teamIds = teams.map((t) => t.id);

        where.OR = [
          {
            userId: user.userId,
          },
          {
            teamId: {
              in: teamIds,
            },
          },
        ];
      } else {
        where.userId = user.userId;
      }
    }

    else if (
      user.role === "FIELD_TECH" ||
      user.role === "TRANSCRIBER"
    ) {
      where.userId = user.userId;
    }

    // Filtro por equipo específico
    if (q.teamId) {
      if (user.role === "ADMIN") {
        where.teamId = q.teamId;
      }

      else if (user.role === "FIELD_MANAGER") {
        const managedTeam = await this.prisma.team.findFirst({
          where: {
            id: q.teamId,
            managerId: user.userId,
          },
        });

        if (!managedTeam) {
          throw new Error("No tienes acceso a este equipo");
        }

        where.teamId = q.teamId;
      }

      else if (user.role === "REGIONAL_MANAGER") {
        const team = await this.prisma.team.findFirst({
          where: {
            id: q.teamId,
            region: {
              managerId: user.userId,
            },
          },
        });

        if (!team) {
          throw new Error("No tienes acceso a este equipo");
        }

        where.teamId = q.teamId;
      }

      else {
        const membership = await this.prisma.teamMember.findFirst({
          where: {
            userId: user.userId,
            teamId: q.teamId,
          },
        });

        if (!membership) {
          throw new Error("No tienes acceso a este equipo");
        }

        where.teamId = q.teamId;
      }
    }

    // Rango por startDate
    if (q.fromDate || q.toDate) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (q.fromDate) {
        dateFilter.gte = new Date(q.fromDate);
      }

      if (q.toDate) {
        const endDate = new Date(q.toDate);
        endDate.setHours(23, 59, 59, 999);
        dateFilter.lte = endDate;
      }

      where.startDate = dateFilter;
    }

    // Filtros simples por campo
    const AND: Prisma.TimeEntryWhereInput[] = [];

    if (q.supportedCountry) {
      AND.push({
        supportedCountry: q.supportedCountry,
      });
    }

    if (q.workingLanguage) {
      AND.push({
        workingLanguage: q.workingLanguage,
      });
    }

    if (q.search) {
      AND.push({
        OR: [
          {
            note: {
              contains: q.search,
              mode: "insensitive",
            },
          },
          {
            recipient: {
              contains: q.search,
              mode: "insensitive",
            },
          },
          {
            personName: {
              contains: q.search,
              mode: "insensitive",
            },
          },
        ],
      });
    }

    if (AND.length > 0) {
      where.AND = AND;
    }

    console.log(
      "TIME ENTRY WHERE:",
      JSON.stringify(where, null, 2)
    );

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

      this.prisma.timeEntry.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: "desc" },
      }),
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

  // Opción simple sin meta si querés
  async listFlat(
    user: { userId: string; role: string; organizationId?: string },
    q: ListTimeEntriesDto
  ) {
    const where = await this.buildWhere(user, q);

    return this.prisma.timeEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async remove(id: string) {
    return this.prisma.timeEntry.delete({ where: { id } });
  }
}
