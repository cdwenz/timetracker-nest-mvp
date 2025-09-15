import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMS_KEY } from '../decorators/perms.decorator';
import type { Permission } from '../permissions';
import { Role } from '../roles.enum';

@Injectable()
export class PermsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as {
      permissions?: Permission[];
      role?: Role;
      organizationId?: string;
      regions?: string[];  // opcional si manejás alcance regional
      teams?: string[];    // opcional si manejás alcance por equipo
      userId?: string;
    };

    if (user?.role === Role.SUPER) return true;
    if (!user?.permissions?.length) return false;

    // TODO (si aplica): validar alcance por org/region/team según req.params o headers
    return required.every(p => user.permissions!.includes(p));
  }
}
