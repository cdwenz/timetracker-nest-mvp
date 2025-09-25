import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // SUPER siempre tiene acceso
    if (user.role === 'SUPER') {
      return true;
    }

    // Roles permitidos para reportes
    const allowedRoles = ['ADMIN', 'REGIONAL_MANAGER', 'FIELD_MANAGER'];
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Rol no autorizado para acceder a reportes');
    }

    // Validar que tenga organización asignada
    if (!user.organizationId) {
      throw new ForbiddenException('Usuario sin organización asignada');
    }

    // Validaciones específicas por rol
    await this.validateRoleSpecificAccess(user, request);

    return true;
  }

  private async validateRoleSpecificAccess(user: any, request: any): Promise<void> {
    const regionId = request.params?.regionId;
    const regionIds = request.query?.regionIds;

    switch (user.role) {
      case 'REGIONAL_MANAGER':
        await this.validateRegionalManagerAccess(user, regionId, regionIds);
        break;
      
      case 'FIELD_MANAGER':
        await this.validateFieldManagerAccess(user, regionId, regionIds);
        break;
      
      case 'ADMIN':
        await this.validateAdminAccess(user, regionId, regionIds);
        break;
    }
  }

  private async validateRegionalManagerAccess(
    user: any, 
    regionId?: string, 
    regionIds?: string[] | string | string
  ): Promise<void> {
    // REGIONAL_MANAGER solo puede ver reportes de las regiones que maneja
    const managedRegions = await this.prisma.region.findMany({
      where: {
        managerId: user.id,
        organizationId: user.organizationId
      },
      select: { id: true }
    });

    const managedRegionIds = managedRegions.map(r => r.id);

    if (managedRegionIds.length === 0) {
      throw new ForbiddenException('No maneja ninguna región');
    }

    // Validar región específica
    if (regionId && !managedRegionIds.includes(regionId)) {
      throw new ForbiddenException('Sin acceso a esta región');
    }

    // Validar múltiples regiones
    if (regionIds) {
      const requestedRegions = Array.isArray(regionIds) 
        ? regionIds 
        : (typeof regionIds === 'string' ? regionIds.split(',').map((id: string) => id.trim()) : []);
        
      const unauthorizedRegions = requestedRegions.filter(
        id => !managedRegionIds.includes(id)
      );

      if (unauthorizedRegions.length > 0) {
        throw new ForbiddenException(
          `Sin acceso a las regiones: ${unauthorizedRegions.join(', ')}`
        );
      }
    }
  }

  private async validateFieldManagerAccess(
    user: any, 
    regionId?: string, 
    regionIds?: string[] | string
  ): Promise<void> {
    // FIELD_MANAGER puede ver reportes de equipos que maneja y sus regiones asociadas
    const managedTeams = await this.prisma.team.findMany({
      where: {
        managerId: user.id,
        organizationId: user.organizationId
      },
      select: { 
        id: true, 
        regionId: true,
        region: {
          select: { id: true }
        }
      }
    });

    const accessibleRegionIds = [
      ...new Set(
        managedTeams
          .filter(team => team.regionId)
          .map(team => team.regionId)
      )
    ];

    if (accessibleRegionIds.length === 0) {
      throw new ForbiddenException('No tiene equipos asignados con regiones');
    }

    // Validar región específica
    if (regionId && !accessibleRegionIds.includes(regionId)) {
      throw new ForbiddenException('Sin acceso a esta región');
    }

    // Validar múltiples regiones
    if (regionIds) {
      const requestedRegions = Array.isArray(regionIds) 
        ? regionIds 
        : (typeof regionIds === 'string' ? regionIds.split(',').map((id: string) => id.trim()) : []);
        
      const unauthorizedRegions = requestedRegions.filter(
        id => !accessibleRegionIds.includes(id)
      );

      if (unauthorizedRegions.length > 0) {
        throw new ForbiddenException(
          `Sin acceso a las regiones: ${unauthorizedRegions.join(', ')}`
        );
      }
    }
  }

  private async validateAdminAccess(
    user: any, 
    regionId?: string, 
    regionIds?: string[] | string
  ): Promise<void> {
    // ADMIN puede ver reportes de toda su organización
    // Validar que las regiones pertenezcan a su organización

    if (regionId) {
      const region = await this.prisma.region.findUnique({
        where: { id: regionId },
        select: { organizationId: true }
      });

      if (!region || region.organizationId !== user.organizationId) {
        throw new ForbiddenException('Región no encontrada o fuera de su organización');
      }
    }

    if (regionIds) {
      const requestedRegions = Array.isArray(regionIds) 
        ? regionIds 
        : (typeof regionIds === 'string' ? regionIds.split(',').map((id: string) => id.trim()) : []);

      const regions = await this.prisma.region.findMany({
        where: {
          id: { in: requestedRegions },
          organizationId: user.organizationId
        },
        select: { id: true }
      });

      const foundRegionIds = regions.map(r => r.id);
      const unauthorizedRegions = requestedRegions.filter(
        id => !foundRegionIds.includes(id)
      );

      if (unauthorizedRegions.length > 0) {
        throw new ForbiddenException(
          `Regiones no encontradas o fuera de su organización: ${unauthorizedRegions.join(', ')}`
        );
      }
    }
  }
}