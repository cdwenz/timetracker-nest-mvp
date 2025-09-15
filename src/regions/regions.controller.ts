import {
  Body, Controller, Delete, ForbiddenException, Get, NotFoundException,
  Param, Patch, Post, Query, Req
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePerms } from '../auth/decorators/perms.decorator';
import { ListRegionsQuery } from './dto/list-regions.query';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

// regions/regions.controller.ts
@Controller('regions')
export class RegionsController {
  constructor(private prisma: PrismaService) {}

  @RequirePerms('region:manage')
  @Post()
  async create(@Body() dto: CreateRegionDto) {
    // opcional: validar que la org exista
    const region = await this.prisma.region.create({
      data: {
        name: dto.name,
        organization: { connect: { id: dto.organizationId } },
      },
      select: { id: true, name: true, organizationId: true, createdAt: true },
    });
    return { message: 'Region creada', region };
  }

    // GET /regions?mine=true|false&organizationId=&search=&skip=&take=
  @Get()
  async list(@Req() req: any, @Query() q: ListRegionsQuery) {
    // Resolver organización objetivo
    let orgId = q.organizationId ?? null;
    const mine = q.mine === 'true';

    if (mine) orgId = req.user.organizationId ?? null;

    if (!orgId) {
      // listar TODAS las regiones sólo para SUPER o quien tenga org:manage
      if (!this.hasOrgManage(req)) {
        throw new ForbiddenException('Requiere org:manage o mine=true');
      }
    } else {
      // si pide una org concreta y NO es la suya, necesita SUPER u org:manage
      if (orgId !== req.user.organizationId && !this.hasOrgManage(req) && req.user?.role !== 'SUPER') {
        throw new ForbiddenException('Fuera de tu organización');
      }
    }

    const where: any = {};
    if (orgId) where.organizationId = orgId;
    if (q.search) where.name = { contains: q.search, mode: 'insensitive' as const };

    const [items, count] = await this.prisma.$transaction([
      this.prisma.region.findMany({
        where,
        skip: q.skip ?? 0,
        take: q.take ?? 20,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, organizationId: true, createdAt: true },
      }),
      this.prisma.region.count({ where }),
    ]);

    return { message: 'OK', count, items };
  }

  // GET /regions/:id  (solo dentro de tu org, salvo SUPER / org:manage)
  @Get(':id')
  async getOne(@Req() req: any, @Param('id') id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      select: { id: true, name: true, organizationId: true, createdAt: true },
    });
    if (!region) throw new NotFoundException('Region no encontrada');

    if (region.organizationId !== req.user.organizationId && !this.hasOrgManage(req) && req.user?.role !== 'SUPER') {
      throw new ForbiddenException('Fuera de tu organización');
    }

    return { message: 'OK', region };
  }

  // PATCH /regions/:id  (region:manage) — sólo tu org, salvo SUPER
  @RequirePerms('region:manage')
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateRegionDto) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      select: { id: true, organizationId: true },
    });
    if (!region) throw new NotFoundException('Region no encontrada');

    this.assertSameOrgOrSuper(req, region.organizationId);

    const updated = await this.prisma.region.update({
      where: { id },
      data: { ...dto },
      select: { id: true, name: true, organizationId: true, updatedAt: true },
    });
    return { message: 'Region actualizada', region: updated };
  }

  // DELETE /regions/:id  (region:manage) — sólo tu org, salvo SUPER
  @RequirePerms('region:manage')
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    const region = await this.prisma.region.findUnique({
      where: { id },
      select: { id: true, organizationId: true, name: true },
    });
    if (!region) throw new NotFoundException('Region no encontrada');

    this.assertSameOrgOrSuper(req, region.organizationId);

    try {
      const del = await this.prisma.region.delete({
        where: { id },
        select: { id: true, name: true },
      });
      return { message: 'Region eliminada', region: del };
    } catch (e: any) {
      if (e?.code === 'P2003') {
        throw new ForbiddenException('No se puede eliminar: existen equipos/usuarios asociados.');
      }
      throw e;
    }
  }

  // -------- helpers --------
  private hasOrgManage(req: any): boolean {
    return (req.user?.permissions ?? []).includes('org:manage') || req.user?.role === 'SUPER';
  }

  private assertSameOrgOrSuper(req: any, targetOrgId: string) {
    if (req.user?.role === 'SUPER') return;
    if (req.user?.organizationId !== targetOrgId) {
      throw new ForbiddenException('Solo podés operar tu organización');
    }
  }
}
