# AVISENS — Backend

API REST del sistema AVISENS. Maneja la lógica de negocio, autenticación, base de datos y comunicación con dispositivos IoT.

> **Estado:** Por iniciar — Fase 2. Este README deja definido el stack y la estructura para arrancar la implementación.

---

## Stack

- **Lenguaje:** TypeScript
- **Runtime:** Node.js
- **Framework:** [NestJS](https://nestjs.com/) (arquitectura modular, inyección de dependencias)
- **Base de datos:** PostgreSQL (relacional)
- **ORM:** [Prisma](https://www.prisma.io/) (type-safe, migraciones)
- **Autenticación:** JWT + refresh tokens (con `@nestjs/jwt` + Passport)
- **Validación:** `class-validator` + `class-transformer` (DTOs)
- **Documentación de API:** Swagger (`@nestjs/swagger`)
- **Gestor de paquetes:** **npm** (igual que el frontend)
- **Contenedores:** Docker + Docker Compose (para PostgreSQL)

> **¿Por qué este stack?** Mismo lenguaje que el frontend (TypeScript) → el equipo es productivo desde el día 1 y se pueden compartir tipos. NestJS impone una estructura limpia por capas, en la misma línea ordenada del frontend. **PostgreSQL** encaja perfecto con el modelo de datos (muy relacional: 39 entidades, 57 FKs) y **Prisma** lo hace type-safe y fácil de migrar. Stack moderno y muy demandado.

---

## Primer arranque (una sola vez)

Cuando empieces la implementación, inicializa el proyecto NestJS dentro de esta carpeta:

```bash
# 1. Instalar el CLI de NestJS (global)
npm i -g @nestjs/cli

# 2. Generar el proyecto en esta carpeta
nest new . --package-manager npm

# 3. Dependencias clave del proyecto
npm i @nestjs/config
npm i @nestjs/jwt @nestjs/passport passport passport-jwt
npm i class-validator class-transformer
npm i @nestjs/swagger

# 4. Prisma (ORM)
npm i @prisma/client
npm i -D prisma
npx prisma init      # crea prisma/schema.prisma y el .env
```

Luego define los modelos en `prisma/schema.prisma`, ajusta el `.env` (ver [Variables de entorno](#variables-de-entorno)) y levanta PostgreSQL con Docker.

---

## Cómo correr localmente

```bash
docker compose up -d        # levanta PostgreSQL en un contenedor
npx prisma migrate dev      # aplica las migraciones a la base
npm run start:dev           # servidor en modo watch (http://localhost:3000)
```

### Otros comandos

```bash
npm run build               # compila a JavaScript (dist/)
npm run start:prod          # corre el build de producción
npm run lint                # ESLint
npm run test                # pruebas unitarias (Jest)
npx prisma studio           # explorador visual de la base de datos
npx prisma migrate dev      # crear/aplicar una migración nueva
```

---

## Arquitectura — modular por dominio

Igual que el frontend (Screaming Architecture), el backend se organiza **por dominio de negocio**, no por tipo técnico. Cada módulo de NestJS agrupa todo lo suyo:

```
prisma/
└── schema.prisma           ← TODO el modelo de datos (tablas + relaciones)

src/
├── main.ts                 ← punto de entrada (bootstrap)
├── app.module.ts           ← módulo raíz (importa los demás)
├── common/                 ← guards, pipes, filtros, decoradores compartidos
├── prisma/                 ← PrismaService (cliente de base de datos inyectable)
└── modules/
    ├── auth/               ← login, registro, JWT, RBAC  (rol Administrador)
    ├── usuarios/           ← CRUD de usuarios, roles, permisos, auditoría
    ├── granjas/            ← granjas y galpones
    ├── lotes/              ← ciclos productivos (bitácora)
    ├── sensores/           ← datos IoT y mediciones
    ├── alertas/
    ├── inventario/
    ├── finanzas/
    └── chatbot/            ← prospectos, cotizaciones (CRM)
```

Cada módulo sigue el patrón estándar de NestJS:

```
modules/granjas/
├── granjas.module.ts       ← declara el módulo
├── granjas.controller.ts   ← define las rutas (endpoints HTTP)
├── granjas.service.ts      ← la lógica de negocio (usa PrismaService)
└── dto/                    ← objetos de entrada/salida validados (create, update)
```

Flujo de una petición: **Controller** (recibe HTTP) → **Service** (lógica) → **Prisma** (lee/escribe en PostgreSQL). Las tablas y relaciones se definen una sola vez en `prisma/schema.prisma`.

---

## Endpoints planeados

| Recurso | Descripción |
|---|---|
| `/auth` | Login, registro, refresh token, MFA admin |
| `/usuarios` | CRUD de usuarios, roles y permisos (RBAC) + auditoría |
| `/granjas` | CRUD de granjas y galpones |
| `/lotes` | Gestión de ciclos productivos |
| `/sensores` | Datos IoT en tiempo real |
| `/alertas` | Alertas y notificaciones |
| `/inventario` | Stock de insumos |
| `/finanzas` | Ingresos y egresos |

La documentación interactiva (Swagger) quedará en `http://localhost:3000/docs`.

---

## Modelo de datos

El diseño completo (39 entidades, 57 FKs) está documentado en `Documentacion avisens/` y se traduce **1:1** a `prisma/schema.prisma`. Como es relacional:

- Las **llaves foráneas** se declaran como relaciones de Prisma (`@relation`).
- Las **tablas puente N:M** (`roles_permisos`, `usuarios_galpones`, `alertas_canales`…) se modelan como tablas explícitas.
- Los **campos calculados** (mortalidad acumulada, FCR, días de autonomía…) **no se guardan**: se derivan en consultas/servicios. Ya están marcados como ELIMINADOS en el diagrama.
- Los snapshots JSON (`bitacora_auditoria.datos_antes/datos_despues`) usan el tipo **`Json`** de Postgres (`jsonb`).

---

## Variables de entorno

Crear un archivo `.env` en la raíz (no se commitea):

```env
PORT=3000
DATABASE_URL="postgresql://avisens:avisens@localhost:5432/avisens?schema=public"
JWT_SECRET=cambia-esto-por-un-secreto-largo
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=otro-secreto-distinto
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Conexión con el frontend

El frontend (`avisens-frontend`) consumirá esta API. Por convención del proyecto:

- Cada feature del frontend pondrá sus llamadas en `features/[nombre]/services/`.
- La configuración del cliente HTTP (base URL = este backend) irá en `shared/services/`.

Habilitar **CORS** en `main.ts` para permitir el origen del frontend (`http://localhost:5173`).

---

## Checklist para arrancar

- [ ] `nest new .` e instalar dependencias clave + Prisma
- [ ] `docker compose up -d` con PostgreSQL
- [ ] Traducir el diagrama a `prisma/schema.prisma` (empezar por el módulo de autenticación)
- [ ] `npx prisma migrate dev` para crear las tablas
- [ ] Crear el módulo `auth` (registro + login + JWT + RBAC) — base de todo lo demás
- [ ] Crear el primer módulo de dominio (`granjas`) como plantilla del resto
- [ ] Habilitar Swagger y CORS
