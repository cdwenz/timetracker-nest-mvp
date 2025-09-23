import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { CreateTimeEntryDto } from "./dto/create-time-entry.dto";
import { TimeTrackerService } from "./time-tracker.service";
import { ListTimeEntriesDto } from "./dto/list-time-entries.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { normalizeListQuery } from "./utils/query-normalizer";
import { RequirePerms } from "src/auth/decorators/perms.decorator";
import { UpdateTimeEntryDto } from "./dto/update-time-entry.dto";

@Controller("time-tracker")
export class TimeTrackerController {
  constructor(
    private service: TimeTrackerService,
    private readonly prisma: PrismaService
  ) {}

  // CREATE
  @Post()
  async create(@Req() req: any, @Body() dto: CreateTimeEntryDto) {
    const userId = req.user?.userId ?? req.user?.sub;

    // 1) Intentar tomar la org del JWT
    let orgId: string | null = req.user?.organizationId ?? null;

    // 2) Si no vino en el JWT, la resolvemos desde la DB
    if (!orgId && userId) {
      const u = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      orgId = u?.organizationId ?? null;
    }

    if (!userId) {
      throw new BadRequestException(
        "No se pudo identificar el usuario autenticado."
      );
    }
    if (!orgId) {
      throw new BadRequestException(
        "Tu usuario no tiene una organización asignada."
      );
    }

    return this.service.create(userId, orgId, dto);
  }

  @Get()
  async list(@Req() req: any, @Query() query: ListTimeEntriesDto) {
    const user = {
      userId: req.user?.userId ?? req.user?.sub,
      role: req.user?.role,
      organizationId: req.user?.organizationId
    };
    
    if (query.returnMeta === false) {
      const response = await this.service.listFlat(user, query);
      // console.log("Res-Flat: ", response);
      return response;
    }
    const response = await this.service.listWithMeta(user, query);
    // console.log("Res-Meta: ", response);
    return response;
  }
}
