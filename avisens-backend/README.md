# AVISENS — Backend

API REST del sistema AVISENS. Maneja la lógica de negocio, autenticación, base de datos y comunicación con dispositivos IoT.

> **Estado:** Por iniciar — Fase 2. Este README deja definido el stack y la estructura para arrancar la implementación.

---

## Stack

- **Lenguaje:** TypeScript
- **Runtime:** Node.js
- **Framework:** [NestJS](https://nestjs.com/) (arquitectura modular, inyección de dependencias)
- **Base de datos:** MongoDB (NoSQL)
- **ODM:** Mongoose
- **Autenticación:** JWT + refresh tokens (con `@nestjs/jwt` + Passport)
- **Validación:** `class-validator` + `class-transformer` (DTOs)
- **Documentación de API:** Swagger (`@nestjs/swagger`)
- **Gestor de paquetes:** **npm** (igual que el frontend)
- **Contenedores:** Docker + Docker Compose (para MongoDB)

> **¿Por qué este stack?** Mismo lenguaje que el frontend (TypeScript) → el equipo es productivo desde el día 1 y se pueden compartir tipos. NestJS impone una estructura limpia por capas, en la misma línea ordenada del frontend. Es el stack **MERN** (Mongo · Nest · React · Node), de los más usados y demandados hoy.

---

## Primer arranque (una sola vez)

Cuando empieces la implementación, inicializa el proyecto NestJS dentro de esta carpeta:

```bash
# 1. Instalar el CLI de NestJS (global)
npm i -g @nestjs/cli

# 2. Generar el proyecto en esta carpeta
nest new . --package-manager npm

# 3. Dependencias clave del proyecto
npm i @nestjs/mongoose mongoose @nestjs/config
npm i @nestjs/jwt @nestjs/passport passport passport-jwt
npm i class-validator class-transformer
npm i @nestjs/swagger
```

Luego crea un `.env` (ver [Variables de entorno](#variables-de-entorno)) y levanta MongoDB con Docker.

---

## Cómo correr localmente

```bash
docker compose up -d     # levanta MongoDB en un contenedor
npm run start:dev        # servidor en modo watch (http://localhost:3000)
```

### Otros comandos

```bash
npm run build            # compila a JavaScript (dist/)
npm run start:prod       # corre el build de producción
npm run lint             # ESLint
npm run test             # pruebas unitarias (Jest)
```

---

## Arquitectura — modular por dominio

Igual que el frontend (Screaming Architecture), el backend se organiza **por dominio de negocio**, no por tipo técnico. Cada módulo de NestJS agrupa todo lo suyo:

```
src/
├── main.ts                 ← punto de entrada (bootstrap)
├── app.module.ts           ← módulo raíz (importa los demás)
├── common/                 ← guards, pipes, filtros, decoradores compartidos
├── config/                 ← configuración (env, conexión a Mongo)
└── modules/
    ├── auth/               ← login, registro, JWT, roles
    ├── usuarios/
    ├── granjas/            ← granjas y galpones
    ├── lotes/              ← ciclos productivos
    ├── sensores/           ← datos IoT (time series)
    ├── alertas/
    ├── inventario/
    └── finanzas/
```

Cada módulo sigue el patrón estándar de NestJS:

```
modules/granjas/
├── granjas.module.ts       ← declara el módulo
├── granjas.controller.ts   ← define las rutas (endpoints HTTP)
├── granjas.service.ts      ← la lógica de negocio
├── schemas/granja.schema.ts← el modelo de Mongoose (documento Mongo)
└── dto/                    ← objetos de entrada/salida validados (create, update)
```

Flujo de una petición: **Controller** (recibe HTTP) → **Service** (lógica) → **Schema/Mongoose** (lee/escribe en Mongo).

---

## Endpoints planeados

| Recurso | Descripción |
|---|---|
| `/auth` | Login, registro, refresh token |
| `/usuarios` | Gestión de roles y permisos (RBAC) |
| `/granjas` | CRUD de granjas y galpones |
| `/lotes` | Gestión de ciclos productivos |
| `/sensores` | Datos IoT en tiempo real |
| `/alertas` | Alertas y notificaciones |
| `/inventario` | Stock de insumos |
| `/finanzas` | Ingresos y egresos |

La documentación interactiva (Swagger) quedará en `http://localhost:3000/docs`.

---

## Modelado de datos en MongoDB

Como es NoSQL, hay que decidir conscientemente entre **embeber** o **referenciar**:

- **Embeber** (documento dentro de otro): cuando los datos se leen siempre juntos y no crecen sin límite. Ej.: la dirección dentro de una granja.
- **Referenciar** (guardar el `_id` de otro documento): cuando son entidades con vida propia o relaciones N:N. Ej.: un `lote` referencia su `galpon`; una `cotización` referencia su `cliente`.

Para los **datos de sensores** (temperatura, humedad, CO₂, NH₃ en el tiempo), usar **Time Series Collections** de MongoDB (nativas desde la v5.0), optimizadas para series de tiempo.

---

## Variables de entorno

Crear un archivo `.env` en la raíz (no se commitea):

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/avisens
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

## Checklist para arrancar mañana

- [ ] `nest new .` e instalar dependencias clave
- [ ] `docker compose up -d` con MongoDB
- [ ] Configurar conexión a Mongo (`@nestjs/mongoose` + `MONGODB_URI`)
- [ ] Crear el módulo `auth` (registro + login + JWT) — base de todo lo demás
- [ ] Crear el primer módulo de dominio (`granjas`) como plantilla del resto
- [ ] Habilitar Swagger y CORS
