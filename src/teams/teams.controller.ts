import {
  Body, Controller, Delete, ForbiddenException, Get, NotFoundException,
  Param, Patch, Post, Query, Req
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePerms } from '../auth/decorators/perms.decorator';
import { ListTeamsQuery } from './dto/list-teams.query';
import { UpdateTeamDto } from './dto/update-team.dto';

// teams/teams.controller.ts
@Controller('teams')
export class TeamsController {
  constructor(private prisma: PrismaService) {}

// teams.controller.ts
@RequirePerms('team:manage')
@Post()
async create(@Req() req: any, @Body() dto: { name: string; regionId: string }) {
  const managerId = req.user.userId; // o el que definas
  const region = await this.prisma.region.findUnique({
    where: { id: dto.regionId },
    select: { id: true, organizationId: true },
  });
  if (!region) throw new NotFoundException('Region no encontrada');

  const team = await this.prisma.team.create({
    data: {
      name: dto.name,
      organization: { connect: { id: region.organizationId } }, // ✅ requerido
      region: { connect: { id: region.id } },                   // ✅ requerido
      manager: { connect: { id: managerId } },                  // ✅ requerido
    },
    select: { id: true, name: true, regionId: true, organizationId: true, managerId: true, createdAt: true },
  });

  return { message: 'Team creado', team };
}

// GET /teams?mine=true|false&organizationId=&regionId=&search=&skip=&take=
  @Get()
  async list(@Req() req: any, @Query() q: ListTeamsQuery) {
    let orgId = q.organizationId ?? null;
    const mine = q.mine === 'true';
    if (mine) orgId = req.user.organizationId ?? null;

    // alcance
    if (orgId) {
      if (orgId !== req.user.organizationId && !this.canManageAcrossOrgs(req)) {
        throw new ForbiddenException('Fuera de tu organización');
      }
    } else {
      // listar todo el universo solo si tiene permisos globales
      if (!this.canManageAcrossOrgs(req)) {
        // si no, limita a su org por defecto
        orgId = req.user.organizationId ?? null;
      }
    }

    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (q.regionId) where.regionId = q.regionId;
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' as const };

    const [items, count] = await this.prisma.$transaction([
      this.prisma.team.findMany({
        where,
        skip: q.skip ?? 0,
        take: q.take ?? 20,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          organizationId: true,
          regionId: true,
          managerId: true,
          createdAt: true,
        },
      }),
      this.prisma.team.count({ where }),
    ]);

    return { message: 'OK', count, items };
  }

  // GET /teams/:id  — solo dentro de tu org salvo SUPER
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: {
        id: true, name: true, organizationId: true, regionId: true, managerId: true, createdAt: true,
      },
    });
    if (!team) throw new NotFoundException('Team no encontrado');

    this.assertSameOrgOrSuper(req, team.organizationId);
    return { message: 'OK', team };
  }

  // PATCH /teams/:id — requiere team:manage, mismo org salvo SUPER
  @RequirePerms('team:manage')
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateTeamDto) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: { id: true, organizationId: true, regionId: true },
    });
    if (!team) throw new NotFoundException('Team no encontrado');

    this.assertSameOrgOrSuper(req, team.organizationId);

    // si mueve de región, validar que la nueva región sea de la misma org (salvo SUPER)
    if (dto.regionId && dto.regionId !== team.regionId && req.user?.role !== 'SUPER') {
      const region = await this.prisma.region.findUnique({
        where: { id: dto.regionId },
        select: { organizationId: true },
      });
      if (!region) throw new NotFoundException('Region destino no existe');
      if (region.organizationId !== team.organizationId) {
        throw new ForbiddenException('No podés mover el team a otra organización');
      }
    }

    const updated = await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.managerId ? { manager: { connect: { id: dto.managerId } } } : {}),
        ...(dto.regionId ? { region: { connect: { id: dto.regionId } } } : {}),
      },
      select: {
        id: true, name: true, organizationId: true, regionId: true, managerId: true, updatedAt: true,
      },
    });

    return { message: 'Team actualizado', team: updated };
  }

  // DELETE /teams/:id — requiere team:manage, mismo org salvo SUPER
  @RequirePerms('team:manage')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true, organizationId: true },
    });
    if (!team) throw new NotFoundException('Team no encontrado');

    this.assertSameOrgOrSuper(req, team.organizationId);

    try {
      const del = await this.prisma.team.delete({
        where: { id },
        select: { id: true, name: true },
      });
      return { message: 'Team eliminado', team: del };
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ForbiddenException('No se puede eliminar: hay usuarios/time entries asociados.');
      }
      throw e;
    }
  }

  // -------- helpers --------
  private canManageAcrossOrgs(req: any): boolean {
    return req.user?.role === 'SUPER' || (req.user?.permissions ?? []).includes('org:manage');
  }

  private assertSameOrgOrSuper(req: any, targetOrgId: string) {
    if (req.user?.role === 'SUPER') return;
    if (req.user?.organizationId !== targetOrgId) {
      throw new ForbiddenException('Solo podés operar tu organización');
    }
  }

}
