# AVISENS — Backend

API REST del sistema **Avisens**: monitoreo ambiental IoT de granjas avícolas.
Gestiona usuarios y roles, granjas/galpones, los nodos ESP32 y sus sensores, la
ingesta de mediciones en tiempo real, y el inventario de insumos.

**Stack:** NestJS · TypeScript · Prisma · PostgreSQL · JWT + Passport · Swagger · Docker

---

## Arquitectura

API REST **por capas**. Cada petición atraviesa esta cadena antes de tocar la
base de datos:

```
Petición HTTP
   │
   ▼
Guards        JwtAuthGuard (¿quién eres?) → RolesGuard (¿tu rol puede?)
   │           · o DeviceTokenGuard para la ingesta del ESP32
   ▼
ValidationPipe  valida el body contra su DTO (400 si no cumple)
   │
   ▼
Controller    recibe la petición y delega — sin lógica
   │
   ▼
Service       lógica de negocio + alcance por dueño (acceso.ts)
   │
   ▼
PrismaService  → PostgreSQL

Cualquier error → filtros globales → respuesta JSON uniforme con su código HTTP.
```

### Control de acceso y RBAC

Avisens usa un RBAC híbrido y explícito:

1. `@Roles` conserva las fronteras gruesas de cada módulo para Administrador,
   Propietario y Operario.
2. `@Permisos` expresa capacidades reutilizables mediante la matriz tipada de
   `src/common/auth/permisos.ts`.
3. Los servicios aplican el alcance por organización, granja y galpón; un
   permiso nunca concede acceso a datos de otro tenant.

El seed sincroniza la matriz con `permisos` y `roles_permisos` para auditoría.
Esta versión no permite crear roles dinámicos desde la API.

---

## Estructura

```
prisma/
├── schema.prisma          modelo de datos completo (tablas + relaciones)
├── migrations/            historial de migraciones (SQL versionado)
└── seeds/                 datos iniciales (roles, admin)

src/
├── main.ts                bootstrap: seguridad, validación, filtros, Swagger
├── app.module.ts          módulo raíz: enchufa todos los módulos
├── prisma/                PrismaService (cliente de BD, inyectable y @Global)
├── common/                lo transversal, reutilizado por todos los módulos
│   ├── acceso.ts          esPropietario() / verificarDueno() — el alcance por dueño
│   ├── guards/            JwtAuthGuard, RolesGuard, DeviceTokenGuard
│   ├── decorators/        @Roles(...)
│   ├── filters/           traducen errores (HTTP y Prisma) a JSON uniforme
│   ├── pagination/        DTO de paginación + helper paginate()
│   └── roles.ts           nombres de rol como constante (evita typos)
└── modules/               una carpeta por dominio de negocio
```

Cada módulo sigue **el mismo patrón** (si entiendes uno, los entiendes todos):

```
modules/sensores/
├── sensores.module.ts       declara y enchufa el módulo
├── sensores.controller.ts   define las rutas (thin: recibe y delega)
├── sensores.service.ts      la lógica de negocio + el alcance por rol
├── sensores.service.spec.ts pruebas de la lógica riesgosa
└── dto/                      contratos de entrada validados (create, update)
```

### Módulos

| Módulo         | Qué gestiona                                                         |
| -------------- | -------------------------------------------------------------------- |
| `auth`         | Login, JWT + refresh token, sesiones y bloqueo por intentos fallidos |
| `usuarios`     | Usuarios y roles (RBAC)                                              |
| `granjas`      | Granjas de un propietario                                            |
| `galpones`     | Galpones de una granja                                               |
| `dispositivos` | Nodos ESP32 (con su token de ingesta)                                |
| `sensores`     | Sensores ambientales de un galpón                                    |
| `mediciones`   | Lecturas de los sensores (serie de tiempo)                           |
| `umbrales`     | Rangos aceptables por variable/semana, versionados                   |
| `proveedores`  | Proveedores de insumos                                               |
| `insumos`      | Inventario de insumos (stock)                                        |
| `ingest`       | Ingesta de lecturas desde el ESP32 (auth por token de dispositivo)   |
| `health`       | Liveness y readiness de PostgreSQL/Redis                             |
| `metrics`      | Métricas operativas en formato Prometheus                            |

---

## Cómo correr

Requiere Docker (para PostgreSQL) y Node.js.

```bash
npm install
cp .env.example .env          # y ajusta los valores (ver más abajo)
docker compose up -d database # levanta PostgreSQL
npm run db:migrate            # aplica las migraciones
npm run seed                  # datos iniciales (roles + usuario admin)
npm run start:dev             # servidor con recarga → http://localhost:3000
```

- **API:** `http://localhost:3000`
- **Swagger (documentación interactiva):** `http://localhost:3000/docs`

> El proyecto completo (BD + backend + frontend) también se levanta desde la raíz
> del repo con `docker compose up --build`.

---

## Cómo probar (calidad)

Los tres gates que deben pasar antes de dar por terminado un cambio:

```bash
npx tsc --noEmit    # tipos (compila sin errores)
npm run lint        # ESLint (cero warnings)
npm run test        # Jest (pruebas unitarias)
npm run test:cov    # + cobertura
```

Las pruebas cubren la **lógica riesgosa** (alcance por rol, autenticación,
validaciones, transacciones), no el 100 % por el 100 %. El CI de GitHub Actions
hace cumplir estos gates en cada push y Pull Request.

---

## Variables de entorno

En un archivo `.env` (no se versiona). Ver `.env.example`:

```env
PORT=3000
DATABASE_URL="postgresql://avisens:avisens@localhost:5432/avisens?schema=public"
JWT_SECRET=...              # secreto del access token
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=...      # secreto del refresh token (distinto)
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:8080
REDIS_HOST=localhost
REDIS_PORT=6379
JOBS_ENABLED=true            # false en réplicas que no deben ejecutar cron
JOB_HISTORY_DAYS=30
IOT_IDEMPOTENCY_DAYS=30
```

La configuración se valida al arrancar: si falta un secreto, la app no inicia.

### Operación e ingesta IoT

- `GET /health/live` comprueba el proceso; `GET /health/ready` y `GET /health`
  comprueban PostgreSQL y Redis.
- `GET /metrics` expone contadores Prometheus. Cada respuesta incluye
  `X-Request-Id` para correlacionar solicitudes con los logs JSON.
- `POST /ingest` acepta como máximo 100 lecturas. El ESP32 debería enviar
  `id_lote` (UUID) y reutilizarlo en sus reintentos; así la API devuelve el
  resultado anterior sin duplicar mediciones. Durante la transición, los nodos
  que todavía no lo envían continúan funcionando, aunque sin deduplicación.
- Los tokens de dispositivo solo se revelan al crearlos o regenerarlos. En la
  base se conserva su hash SHA-256; los tokens antiguos migran al primer uso.
- Las ejecuciones programadas se coordinan en PostgreSQL por nombre y ventana,
  de modo que varias réplicas no procesen el mismo job simultáneamente.
- Un job diario elimina bitácoras e idempotencias vencidas según los periodos
  configurados, evitando crecimiento indefinido de las tablas operativas.

---

## Convenciones

- **Controlador tonto, servicio inteligente:** las rutas solo reciben y delegan;
  toda la lógica vive en los servicios.
- **Todo dato de entrada pasa por un DTO** validado con `class-validator`.
- **Los listados se paginan** con el `PaginationQueryDto` común y devuelven
  `{ data, meta }`.
- **Nunca se expone de más:** cada consulta usa un `select` explícito (p. ej. el
  `password_hash` del usuario jamás sale en una respuesta).
- **Los errores no se manejan a mano** en cada servicio: los filtros globales
  traducen las excepciones (incluidas las de Prisma) a respuestas uniformes.
- **Commits** en español siguiendo Conventional Commits.
