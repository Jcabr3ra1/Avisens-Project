# Guía del Backend — Avisens

Esta guía explica qué hace cada carpeta y cada archivo del proyecto.
Está escrita para que cualquier persona que abra este código por primera vez
entienda cómo está organizado y por qué.

---

## ¿Qué es este proyecto?

Es el servidor (backend) del sistema **Avisens**, una plataforma de monitoreo
para granjas avícolas. Este servidor expone una **API REST** que el frontend
consume para autenticar usuarios y gestionar datos.

---

## Cómo correr el proyecto

```bash
# 1. Levantar la base de datos (requiere Docker)
docker compose up -d

# 2. Instalar dependencias (solo la primera vez)
npm install

# 3. Aplicar las tablas a la base de datos (solo la primera vez)
npx prisma migrate dev

# 4. Crear el usuario administrador inicial (solo la primera vez)
npm run seed

# 5. Arrancar el servidor en modo desarrollo
npm run start:dev
```

El servidor queda disponible en:
- API: `http://localhost:3000`
- Documentación interactiva: `http://localhost:3000/docs`

---

## Estructura de carpetas

```
avisens-backend/
│
├── prisma/                        ← Todo lo relacionado con la base de datos
│   ├── schema.prisma              ← Define las tablas y sus relaciones
│   ├── migrations/                ← Historial de cambios en la base de datos
│   └── seeds/
│       └── seed.ts                ← Crea los roles y el admin inicial
│
├── src/                           ← Todo el código del servidor
│   │
│   ├── main.ts                    ← Punto de entrada. Aquí arranca el servidor
│   ├── app.module.ts              ← Módulo raíz que conecta todas las piezas
│   │
│   ├── config/
│   │   └── env.validation.ts      ← Valida que el .env tenga todo lo necesario
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts       ← Registra el servicio de base de datos
│   │   └── prisma.service.ts      ← Conexión a PostgreSQL (se inyecta donde se necesite)
│   │
│   ├── common/                    ← Piezas reutilizables por todos los módulos
│   │   ├── decorators/
│   │   │   └── roles.decorator.ts ← @Roles('Admin') — marca qué roles pueden entrar
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts  ← Verifica que el token JWT sea válido
│   │   │   └── roles.guard.ts     ← Verifica que el rol del usuario tenga permiso
│   │   └── filters/
│   │       └── http-exception.filter.ts ← Maneja errores y devuelve respuestas claras
│   │
│   └── modules/                   ← Módulos de negocio (uno por dominio)
│       │
│       ├── auth/                  ← Todo lo relacionado con autenticación
│       │   ├── auth.module.ts     ← Registra el módulo de auth
│       │   ├── auth.controller.ts ← Define las rutas: /auth/login, /refresh, /logout
│       │   ├── auth.service.ts    ← Lógica del login, tokens y bloqueo de cuentas
│       │   ├── dto/
│       │   │   ├── login.dto.ts   ← Valida los datos del login (email + password)
│       │   │   └── refresh.dto.ts ← Valida el refresh token
│       │   └── strategies/
│       │       ├── jwt.strategy.ts         ← Cómo se valida el access token
│       │       └── jwt-refresh.strategy.ts ← Cómo se valida el refresh token
│       │
│       └── usuarios/              ← Gestión de usuarios (solo para Administrador)
│           ├── usuarios.module.ts
│           ├── usuarios.controller.ts ← Rutas: POST/GET/DELETE /usuarios
│           ├── usuarios.service.ts    ← Lógica: crear, listar, desactivar usuarios
│           └── dto/
│               └── create-usuario.dto.ts ← Valida los datos al crear un usuario
│
├── docker-compose.yml             ← Levanta PostgreSQL en un contenedor
├── .env                           ← Variables de entorno (NO se sube al repositorio)
└── package.json                   ← Dependencias y scripts del proyecto
```

---

## Archivos clave explicados

### `prisma/schema.prisma`
Define el diseño de la base de datos. Cada `model` es una tabla.
Cuando se modifica este archivo, se corre `npx prisma migrate dev`
para que los cambios se apliquen en PostgreSQL.

### `src/main.ts`
Es el primer archivo que se ejecuta. Configura:
- **CORS**: permite peticiones del frontend (`localhost:5173`)
- **ValidationPipe**: activa la validación automática de todos los DTOs
- **HttpExceptionFilter**: captura errores y devuelve respuestas JSON limpias
- **Swagger**: genera la documentación automática en `/docs`

### `src/app.module.ts`
Es el módulo raíz. Importa y conecta todos los demás módulos.
También activa la lectura del `.env` y la validación de variables de entorno.

### `src/prisma/prisma.service.ts`
Es la conexión a la base de datos. Al extender `PrismaClient`,
se puede usar `this.prisma.usuario.findMany()` en cualquier servicio.
Al ser `@Global()`, no necesita importarse en cada módulo.

### `src/common/`
Carpeta para código que no pertenece a un solo módulo sino que es transversal:
- **guards**: controlan el acceso a los endpoints
- **decorators**: anotan los endpoints con metadatos (ej: qué roles pueden entrar)
- **filters**: interceptan los errores antes de que lleguen al cliente

### `src/modules/auth/auth.service.ts`
Aquí vive toda la lógica del login:
1. Busca el usuario por email
2. Verifica si la cuenta está bloqueada
3. Compara la contraseña con el hash guardado
4. Si falla 5 veces → bloquea la cuenta 15 minutos
5. Si pasa → genera access token (15 min) y refresh token (7 días)
6. Guarda el hash del refresh token en la tabla `sesiones`

### `src/modules/usuarios/`
Solo el Administrador puede usar estos endpoints.
El `RolesGuard` verifica el rol antes de dejar pasar la petición.

---

## Endpoints disponibles

| Método | Ruta | Quién puede usarlo | Qué hace |
|---|---|---|---|
| POST | `/auth/login` | Todos | Inicia sesión, devuelve tokens |
| POST | `/auth/refresh` | Usuario autenticado | Renueva el access token |
| POST | `/auth/logout` | Usuario autenticado | Cierra la sesión |
| POST | `/usuarios` | Solo Administrador | Crea un nuevo usuario |
| GET | `/usuarios` | Solo Administrador | Lista todos los usuarios |
| GET | `/usuarios/:id` | Solo Administrador | Ver detalle de un usuario |
| DELETE | `/usuarios/:id` | Solo Administrador | Desactiva un usuario |

---

## Flujo de una petición protegida

```
Cliente (Postman / Frontend)
        │
        │  POST /usuarios  +  Authorization: Bearer <access_token>
        ▼
   JwtAuthGuard  ──── ¿El token es válido? ──── NO ──▶ 401 Unauthorized
        │
       SÍ
        │
   RolesGuard  ─────── ¿El rol es Admin? ──────  NO ──▶ 403 Forbidden
        │
       SÍ
        │
   UsuariosController ──▶ UsuariosService ──▶ PrismaService ──▶ PostgreSQL
        │
        ▼
   Respuesta JSON al cliente
```

---

## Variables de entorno (`.env`)

El archivo `.env` **nunca se sube al repositorio** (está en `.gitignore`).
Cada desarrollador debe crearlo localmente con estos valores:

```env
DATABASE_URL="postgresql://avisens:avisens@localhost:5432/avisens?schema=public"
JWT_SECRET=un-secreto-largo-y-aleatorio
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=otro-secreto-diferente
JWT_REFRESH_EXPIRES_IN=7d
PORT=3000
```

Si falta alguna variable obligatoria (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`),
el servidor no arranca y muestra un error claro gracias a `config/env.validation.ts`.

---

## Tecnologías usadas

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| NestJS | 11 | Framework del servidor |
| TypeScript | 5 | Lenguaje con tipado estático |
| Prisma | 7 | ORM para interactuar con PostgreSQL |
| PostgreSQL | 16 | Base de datos relacional |
| Docker | - | Contenedor de la base de datos |
| JWT (passport-jwt) | - | Autenticación sin sesiones |
| bcrypt | - | Hash de contraseñas y tokens |
| Swagger | - | Documentación automática de la API |
| class-validator | - | Validación de datos de entrada |
