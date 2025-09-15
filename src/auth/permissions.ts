import { Role } from './roles.enum';

export type Permission =
  | 'org:manage'
  | 'user:manage'
  | 'region:manage'
  | 'team:manage'
  | 'time:read'
  | 'time:create'
  | 'time:update'
  | 'time:approve'
  | 'report:read'
  | 'report:export'
  | 'transcript:read'
  | 'transcript:create';

const MAP: Record<Role, Permission[]> = {
  [Role.SUPER]: [
    'org:manage','user:manage','region:manage','team:manage',
    'time:read','time:create','time:update','time:approve',
    'report:read','report:export','transcript:read','transcript:create',
  ],
  [Role.ADMIN]: [
    'org:manage','user:manage','region:manage','team:manage',
    'time:read','time:create','time:update','time:approve',
    'report:read','report:export','transcript:read','transcript:create',
  ],
  [Role.REGIONAL_MANAGER]: [
    'region:manage','team:manage',
    'time:read','time:create','time:update','time:approve',
    'report:read',
    'transcript:read',
  ],
  [Role.FIELD_MANAGER]: [
    'team:manage',
    'time:read','time:create','time:update','time:approve',
    'report:read',
    'transcript:read',
  ],
  [Role.FIELD_TECH]: [
    'time:read','time:create','time:update',
    'report:read',
  ],
  [Role.TRANSCRIBER]: [
    'transcript:read','transcript:create',
    'time:read',
  ],
};

export function permissionsForRole(role: Role): Permission[] {
  return MAP[role] ?? [];
}
