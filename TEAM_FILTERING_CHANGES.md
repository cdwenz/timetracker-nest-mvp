# 🔧 Cambios necesarios para filtros de "Mi Equipo" vs "Yo"

## 🚨 Problema identificado

**PROBLEMA REAL**: El backend tiene lógica incorrecta de permisos en `time-tracker.service.ts` líneas 44-46:

```typescript
} else {
  // USER y FIELD_MANAGER solo ven lo propio  <- ¡ESTO ESTÁ MAL!
  where.userId = user.userId;
}
```

**Comportamiento actual (incorrecto):**
- **ADMIN**: Ve todos los registros
- **FIELD_MANAGER**: Solo ve sus propios registros (¡INCORRECTO!)
- **USER**: Solo ve sus propios registros (correcto)

**Comportamiento esperado (correcto):**
- **ADMIN**: Ve todos los registros de la organización
- **FIELD_MANAGER**: Ve registros de su equipo/región + sus propios registros
- **USER**: Solo ve sus propios registros

## 📋 Cambios requeridos en el backend (rama development)

### 1. **Modificar DTO: `src/time-tracker/dto/list-time-entries.dto.ts`**

```typescript
export class ListTimeEntriesQueryDto {
  @IsOptional() @IsString()
  createdBy?: string;

  // 🆕 NUEVOS: Filtros de equipo
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  myTeam?: boolean; // Si es true, mostrar registros de mis equipos

  @IsOptional() @IsString()
  teamId?: string; // Filtrar por equipo específico

  // ... resto de campos existentes
}
```

### 2. **Modificar servicio: `src/time-tracker/time-tracker.service.ts`**

**Cambiar el método `buildWhere()` para agregar lógica de equipos:**

```typescript
private async buildWhere(
  user: { userId: string; role: string; organizationId?: string },
  q: ListTimeEntriesQueryDto
) {
  const where: Prisma.TimeEntryWhereInput = {};

  // 🔧 CORRECCIÓN URGENTE: Arreglar lógica de roles primero
  if (user.role === "ADMIN") {
    // ADMIN puede ver todo o filtrar por usuario específico
    if (q.createdBy) where.userId = q.createdBy;
  } else if (user.role === "FIELD_MANAGER") {
    // FIELD_MANAGER debe ver registros de su equipo/región
    if (q.myTeam === true) {
      // Opción 1: Todos los registros de la misma organización (temporal)
      where.organizationId = user.organizationId;
      
      // Opción 2: Solo registros de equipos donde es miembro (ideal)
      // const userTeams = await this.prisma.teamMember.findMany({
      //   where: { userId: user.userId },
      //   select: { teamId: true }
      // });
      // const teamIds = userTeams.map(tm => tm.teamId);
      // where.OR = [
      //   { userId: user.userId },
      //   { teamId: { in: teamIds } }
      // ];
    } else {
      // Solo mis registros
      where.userId = user.userId;
    }
  } else {
    // USER solo ve sus propios registros
    where.userId = user.userId;
  }

  // 🆕 NUEVA LÓGICA ADICIONAL: Filtros por equipo específico
  if (q.teamId) {
    // Mostrar registros de equipos donde soy miembro
    const userTeams = await this.prisma.teamMember.findMany({
      where: { userId: user.userId },
      select: { teamId: true }
    });
    
    const teamIds = userTeams.map(tm => tm.teamId);
    
    if (teamIds.length > 0) {
      where.OR = [
        { userId: user.userId }, // Mis propios registros
        { teamId: { in: teamIds } }, // Registros de mis equipos
      ];
    } else {
      // No pertenezco a ningún equipo, solo mis registros
      where.userId = user.userId;
    }
  } else if (q.teamId) {
    // Filtrar por equipo específico (verificar que soy miembro)
    const isMember = await this.prisma.teamMember.findFirst({
      where: { userId: user.userId, teamId: q.teamId }
    });
    
    if (isMember || user.role === 'ADMIN') {
      where.teamId = q.teamId;
    } else {
      throw new ForbiddenException('No tienes acceso a este equipo');
    }
  } else {
    // 🔄 LÓGICA EXISTENTE: Visibilidad por rol
    if (user.role === "ADMIN") {
      if (q.createdBy) where.userId = q.createdBy;
    } else {
      // USER y FIELD_MANAGER solo ven lo propio
      where.userId = user.userId;
    }
  }

  // ... resto de filtros existentes (fechas, país, idioma, etc.)
  
  return where;
}
```

**❗ Importante:** El método `buildWhere` ahora necesita ser `async` porque hace consultas a la DB para verificar membresías de equipos.

**También hay que actualizar las llamadas:**

```typescript
async listWithMeta(
  user: { userId: string; role: string; organizationId?: string },
  q: ListTimeEntriesQueryDto
) {
  // ... código existente ...
  
  const where = await this.buildWhere(user, q); // 🔄 Ahora es async
  
  // ... resto igual
}

async listFlat(
  user: { userId: string; role: string; organizationId?: string },
  q: ListTimeEntriesQueryDto
) {
  const where = await this.buildWhere(user, q); // 🔄 Ahora es async
  
  // ... resto igual
}
```

### 3. **Actualizar el controlador si es necesario**

Asegurar que el JWT incluya `organizationId` si no lo tiene ya:

```typescript
@Get()
async list(@Req() req: any, @Query() query: ListTimeEntriesQueryDto) {
  const user = {
    userId: req.user?.userId ?? req.user?.sub,
    role: req.user?.role,
    organizationId: req.user?.organizationId
  };
  
  if (query.returnMeta === false) {
    return this.service.listFlat(user, query);
  }
  return this.service.listWithMeta(user, query);
}
```

## 🧪 Casos de prueba para el backend

### Test 1: Usuario con equipo solicita "Mi Equipo"
```bash
GET /time-tracker?myTeam=true
# Debería devolver: registros del usuario + registros de sus equipos
```

### Test 2: Usuario sin equipo solicita "Mi Equipo" 
```bash
GET /time-tracker?myTeam=true
# Debería devolver: solo registros del usuario
```

### Test 3: Usuario solicita equipo específico
```bash
GET /time-tracker?teamId=uuid-del-equipo
# Debería devolver: registros de ese equipo (si es miembro o admin)
```

### Test 4: Usuario sin filtros (comportamiento actual)
```bash
GET /time-tracker
# Debería devolver: solo registros del usuario (como antes)
```

## 📱 Cambios en el frontend

Una vez implementados los cambios del backend, el frontend puede usar:

```dart
// Para "Mi Equipo"
final teamEntries = await _fetchEntries(
  fromDate: from,
  toDate: to,
  myTeam: true, // 🆕 Nuevo parámetro
);

// Para "Yo" (comportamiento actual)
final myEntries = await _fetchEntries(
  fromDate: from,
  toDate: to,
  // Sin myTeam = solo mis registros
);
```

## ⚡ Implementación por fases

### Fase 1: Backend básico
- Implementar `myTeam=true/false` en el DTO
- Agregar lógica en `buildWhere()`
- Probar con Postman/curl

### Fase 2: Frontend
- Modificar `ReportsMetricsService` para usar `myTeam`
- Actualizar las llamadas del dashboard

### Fase 3: Optimizaciones
- Cachear membresías de equipos si es necesario
- Agregar índices DB para `teamId` en `TimeEntry`
- Agregar filtros avanzados (por región, etc.)

---

## 💡 Alternativa más simple (sin cambios mayores)

Si no quieres cambiar mucho el backend, otra opción es:

1. **Crear endpoint separado**: `/time-tracker/team-entries`
2. **Lógica simple**: Devolver todos los registros de la organización del usuario
3. **Filtrado en frontend**: El cliente filtra por equipos específicos

Pero la solución con `myTeam=true` es más escalable y eficiente.