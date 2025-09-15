import {
  Body, Controller, Delete, ForbiddenException, Get, NotFoundException,
  Param, Patch, Post, Query, Req
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePerms } from '../auth/decorators/perms.decorator';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { ListOrganizationsQuery } from './dto/list-organizations.query';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Controller('organizations')
export class OrganizationsController {
  constructor(private prisma: PrismaService) {}

  @RequirePerms('org:manage')
  @Post()
  async create(@Body() dto: CreateOrganizationDto) {
    const org = await this.prisma.organization.create({
      data: { name: dto.name },
      select: { id: true, name: true, createdAt: true },
    });
    return { message: 'Organization creada', organization: org };
  }

  // GET /organizations?mine=true|false&search=...&skip=&take=
  @Get()
  async list(@Req() req: any, @Query() q: ListOrganizationsQuery) {
    const isMine = q.mine === 'true';

    if (isMine) {
      // cualquiera autenticado puede ver SU org
      const orgId = req.user.organizationId;
      if (!orgId) return { message: 'Sin organización asociada', count: 0, items: [] };

      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, createdAt: true },
      });
      return { message: 'OK', count: org ? 1 : 0, items: org ? [org] : [] };
    }

    // listar otras orgs exige permiso de gestión
    this.assertCanManageAnyOrg(req);

    const where = q.search
      ? { name: { contains: q.search, mode: 'insensitive' as const } }
      : {};

    const [items, count] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        skip: q.skip ?? 0,
        take: q.take ?? 20,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { message: 'OK', count, items };
  }

  // GET /organizations/:id
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    // si no tiene org:manage, solo puede ver su propia org
    const hasManage = this.hasOrgManage(req);
    const sameOrg = req.user.organizationId === id;
    if (!hasManage && !sameOrg) {
      throw new ForbiddenException('Fuera de tu organización');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, createdAt: true },
    });
    if (!org) throw new NotFoundException('Organization no encontrada');
    return { message: 'OK', organization: org };
  }

  // PATCH /organizations/:id  (ADMIN/SUPER dentro de su org; SUPER puede cualquier org)
  @RequirePerms('org:manage')
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    this.assertSameOrgOrSuper(req, id);

    const org = await this.prisma.organization.update({
      where: { id },
      data: { ...dto },
      select: { id: true, name: true, updatedAt: true },
    });
    return { message: 'Organization actualizada', organization: org };
  }

  // DELETE /organizations/:id  (ADMIN/SUPER en su org; SUPER cualquiera)
  @RequirePerms('org:manage')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    this.assertSameOrgOrSuper(req, id);

    try {
      const org = await this.prisma.organization.delete({
        where: { id },
        select: { id: true, name: true },
      });
      return { message: 'Organization eliminada', organization: org };
    } catch (e: any) {
      // P2003: foreign key constraint
      if (e?.code === 'P2003') {
        throw new ForbiddenException(
          'No se puede eliminar: existen regiones/equipos/usuarios asociados. Eliminá dependencias primero.'
        );
      }
      throw e;
    }
  }

  // ---------- helpers de alcance/permisos ----------

  private hasOrgManage(req: any): boolean {
    return (req.user?.permissions ?? []).includes('org:manage') || req.user?.role === 'SUPER';
  }

  private assertCanManageAnyOrg(req: any) {
    if (!this.hasOrgManage(req)) {
      throw new ForbiddenException('Requiere org:manage');
    }
  }

  private assertSameOrgOrSuper(req: any, targetOrgId: string) {
    if (req.user?.role === 'SUPER') return;
    if (req.user?.organizationId !== targetOrgId) {
      throw new ForbiddenException('Solo podés operar tu organización');
    }
  }
}