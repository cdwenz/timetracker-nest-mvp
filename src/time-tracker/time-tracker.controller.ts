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

  // LIST
   @Get()
  async list(@Req() req: any, @Query() q: ListTimeEntriesDto) {
    const role = req.user?.role;
    const orgId = req.user?.organizationId;
    const currentUserId = req.user?.userId ?? req.user?.sub;

    const norm = normalizeListQuery(q, { take: 20 });

    return this.service.list({
      role,
      orgId,
      currentUserId,
      ...norm,
    });
  }

  // DETAIL
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const entry = await this.service.findOne(id);

    if (!entry) throw new NotFoundException('TimeEntry no encontrado');

    // Sólo SUPER/ADMIN ven cualquier entry; otros solo los propios
    if (req.user.role !== 'SUPER' && req.user.role !== 'ADMIN' && entry.userId !== req.user.userId) {
      throw new ForbiddenException('No autorizado para ver este registro');
    }

    return { message: 'OK', entry };
  }

  // UPDATE
  @RequirePerms('time:update')
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    const entry = await this.service.findOne(id);
    if (!entry) throw new NotFoundException('TimeEntry no encontrado');

    if (req.user.role !== 'SUPER' && req.user.role !== 'ADMIN' && entry.userId !== req.user.userId) {
      throw new ForbiddenException('No autorizado para editar este registro');
    }

    const updated = await this.service.update(id, dto);
    return { message: 'TimeEntry actualizado', entry: updated };
  }

  // DELETE
  @RequirePerms('time:update') // o podrías usar 'time:approve'
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const entry = await this.service.findOne(id);
    if (!entry) throw new NotFoundException('TimeEntry no encontrado');

    if (req.user.role !== 'SUPER' && req.user.role !== 'ADMIN' && entry.userId !== req.user.userId) {
      throw new ForbiddenException('No autorizado para eliminar este registro');
    }

    const deleted = await this.service.remove(id);
    return { message: 'TimeEntry eliminado', entry: deleted };
  }
}
