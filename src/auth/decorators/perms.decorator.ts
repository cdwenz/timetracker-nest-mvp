import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../permissions';
export const PERMS_KEY = 'perms';
export const RequirePerms = (...perms: Permission[]) => SetMetadata(PERMS_KEY, perms);

