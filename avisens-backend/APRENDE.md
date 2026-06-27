# Cómo construimos el backend de Avisens — paso a paso

Este documento explica qué se hizo, por qué se hizo y cómo funciona cada parte.
Está escrito para que lo entiendas aunque no hayas tocado el código.

---

## Paso 1 — Inicializar el proyecto con NestJS

**¿Qué hicimos?**
Corrimos el comando `nest new .` dentro de la carpeta `avisens-backend/`.

**¿Para qué sirve?**
NestJS es un framework de Node.js que nos da una estructura organizada desde el principio.
Al inicializarlo, nos crea automáticamente los archivos base del servidor:
- `main.ts` → el punto de entrada, donde el servidor "arranca"
- `app.module.ts` → el módulo raíz que conecta todas las piezas
- `tsconfig.json` → la configuración de TypeScript

**¿Por qué NestJS y no Express solo?**
Express es más flexible pero te obliga a organizar todo tú mismo.
NestJS impone una estructura por módulos que escala mejor cuando el proyecto crece.

---

## Paso 2 — Instalar las dependencias necesarias

**¿Qué hicimos?**
Instalamos varios paquetes con `npm install`.

**¿Qué instalamos y para qué sirve cada uno?**

| Paquete | Para qué sirve |
|---|---|
| `@nestjs/config` | Leer variables de entorno del archivo `.env` |
| `@nestjs/jwt` | Crear y verificar tokens JWT |
| `@nestjs/passport` + `passport` | Sistema de autenticación modular |
| `passport-jwt` | Estrategia específica para validar tokens JWT |
| `bcrypt` | Convertir contraseñas en hash (nunca guardar texto plano) |
| `class-validator` | Validar que los datos que llegan al servidor sean correctos |
| `class-transformer` | Transformar los datos de entrada en objetos TypeScript |
| `@nestjs/swagger` | Generar documentación automática de la API |
| `@prisma/client` | El cliente que usamos para hablar con la base de datos |
| `prisma` | La herramienta CLI para manejar migraciones y el schema |
| `@prisma/adapter-pg` | Adaptador que conecta Prisma con PostgreSQL |

---

## Paso 3 — Configurar Prisma y diseñar la base de datos

**¿Qué hicimos?**
Corrimos `npx prisma init` y luego editamos el archivo `prisma/schema.prisma`.

**¿Qué es Prisma?**
Prisma es un ORM (Object Relational Mapper). En lugar de escribir SQL a mano,
defines tus tablas en un archivo `.prisma` y Prisma se encarga de crear las tablas
en PostgreSQL y darte un cliente con autocompletado para hacer consultas.

**¿Qué tablas diseñamos?**

```
roles              → Los tipos de usuario que existen (Admin, Propietario, Operario)
permisos           → Acciones específicas que se pueden permitir o denegar
roles_permisos     → Qué permisos tiene cada rol (tabla puente N:M)
usuarios           → Las personas registradas en el sistema
seguridad_cuenta   → Intentos fallidos de login y bloqueos por usuario
sesiones           → Refresh tokens activos de cada usuario
```

**¿Qué es una migración?**
Es un archivo SQL que Prisma genera automáticamente a partir de tu schema.
Cuando corres `npx prisma migrate dev`, Prisma compara tu schema con la base de datos
y aplica los cambios necesarios. Así la base de datos siempre está sincronizada con tu código.

---

## Paso 4 — Levantar PostgreSQL con Docker

**¿Qué hicimos?**
Creamos un archivo `docker-compose.yml` y corrimos `docker compose up -d`.

**¿Qué es Docker?**
Docker permite correr programas dentro de "contenedores" aislados.
En lugar de instalar PostgreSQL directamente en tu computador,
lo corremos dentro de un contenedor que tiene todo lo necesario.

**¿Ventajas?**
- No ensucias tu sistema operativo con instalaciones
- Si borras el contenedor, tu computador queda limpio
- Cualquier desarrollador puede levantar exactamente el mismo entorno con un comando

**¿Qué hace el `docker-compose.yml`?**
Define qué imagen usar (`postgres:16-alpine`), las credenciales de la base de datos
y en qué puerto escuchar (`5432`). También crea un volumen para que los datos
persistan aunque el contenedor se reinicie.

---

## Paso 5 — Crear el archivo `.env`

**¿Qué hicimos?**
Creamos un archivo `.env` en la raíz del proyecto con las variables de entorno.

**¿Qué es un archivo `.env`?**
Es un archivo donde guardas configuración sensible que NO va en el código:
contraseñas, claves secretas, URLs de conexión, etc.
Este archivo está en el `.gitignore`, es decir, nunca se sube al repositorio.

**¿Qué variables definimos?**

```env
DATABASE_URL   → URL de conexión a PostgreSQL
JWT_SECRET     → Clave secreta para firmar los access tokens
JWT_EXPIRES_IN → Cuánto tiempo dura el access token (15 minutos)
JWT_REFRESH_SECRET  → Clave secreta para los refresh tokens
JWT_REFRESH_EXPIRES_IN → Cuánto dura el refresh token (7 días)
PORT           → Puerto donde corre el servidor (3000)
```

---

## Paso 6 — Crear el PrismaService

**¿Qué hicimos?**
Creamos `src/prisma/prisma.service.ts` y `src/prisma/prisma.module.ts`.

**¿Para qué sirve?**
En NestJS, todo se inyecta como servicio. El `PrismaService` es la clase
que representa la conexión a la base de datos. Al marcarlo como `@Global()`,
cualquier otro módulo puede usarlo sin necesidad de importarlo explícitamente.

**¿Cómo funciona la inyección de dependencias?**
En lugar de crear instancias de clases con `new`, NestJS las crea por ti
y las "inyecta" donde las necesitas. Esto hace el código más fácil de probar y mantener.

---

## Paso 7 — Crear el módulo de autenticación (auth)

**¿Qué hicimos?**
Creamos la carpeta `src/auth/` con varios archivos. Cada uno tiene una responsabilidad:

### DTOs (`src/auth/dto/`)
DTO = Data Transfer Object. Son clases que definen qué datos se esperan recibir
y qué validaciones deben cumplir.

Por ejemplo, el `LoginDto` dice:
- `email` → debe ser un email válido
- `password` → debe ser string de mínimo 6 caracteres

Si alguien manda datos incorrectos, NestJS los rechaza automáticamente antes
de que lleguen al servicio.

### Estrategias (`src/auth/strategies/`)
Las estrategias le dicen a Passport cómo validar un token.

- `JwtStrategy` → extrae el token del header `Authorization: Bearer ...`,
  lo verifica con el secreto, y busca al usuario en la base de datos.
- `JwtRefreshStrategy` → hace lo mismo pero con el refresh token,
  que viene en el body de la petición.

### Guards (`src/auth/guards/`)
Los guards son "porteros" que se ejecutan antes de que una petición llegue al controlador.

- `JwtAuthGuard` → verifica que el token de acceso sea válido
- `RolesGuard` → verifica que el rol del usuario tenga permiso para ese endpoint

### Decorator (`src/auth/decorators/`)
`@Roles('Administrador')` es un decorador personalizado. Se pone encima de un
endpoint para indicarle al `RolesGuard` qué roles pueden acceder.

### AuthService (`src/auth/auth.service.ts`)
Aquí vive toda la lógica del login:
1. Buscar el usuario por email
2. Verificar si está bloqueado
3. Comparar la contraseña con el hash guardado
4. Si falla → incrementar intentos fallidos (bloquear tras 5)
5. Si pasa → generar access token y refresh token
6. Guardar el hash del refresh token en la tabla `sesiones`

### AuthController (`src/auth/auth.controller.ts`)
Define las rutas HTTP:
- `POST /auth/login` → llama al servicio de login
- `POST /auth/refresh` → renueva el access token
- `POST /auth/logout` → revoca la sesión

---

## Paso 8 — Crear el módulo de usuarios

**¿Qué hicimos?**
Creamos `src/usuarios/` con su controlador, servicio y DTO.

**¿Qué puede hacer este módulo?**
- Crear un usuario nuevo (con su contraseña hasheada)
- Listar todos los usuarios
- Ver el detalle de un usuario
- Desactivar un usuario (no se borra, solo se marca como inactivo)

**¿Quién puede usarlo?**
Solo usuarios con rol `Administrador`. Cualquier otra petición recibe `403 Forbidden`.

---

## Paso 9 — Configurar main.ts

**¿Qué hicimos?**
Editamos `src/main.ts` para agregar tres cosas:

1. **CORS** → permite que el frontend (`localhost:5173`) haga peticiones al backend
2. **ValidationPipe** → activa la validación global de DTOs en toda la aplicación
3. **Swagger** → genera la documentación automática en `/docs`

---

## Paso 10 — Crear el seed

**¿Qué hicimos?**
Creamos `prisma/seeds/seed.ts` y lo ejecutamos con `npm run seed`.

**¿Qué es un seed?**
Es un script que inserta datos iniciales en la base de datos.
Sin esto, la base de datos queda vacía y no hay forma de hacer login.

**¿Qué inserta nuestro seed?**
1. Los tres roles: Administrador, Propietario, Operario
2. El usuario administrador inicial:
   - Email: `admin@avisens.com`
   - Contraseña: `Admin1234!`

---

## Resumen del flujo completo

```
1. npm run start:dev       → arranca el servidor en localhost:3000
2. POST /auth/login        → el frontend manda email + contraseña
3. El servidor verifica    → usuario existe, contraseña correcta, no bloqueado
4. Devuelve tokens         → access_token + refresh_token
5. El frontend guarda los tokens y los manda en cada petición protegida
6. GET /usuarios           → el servidor verifica el token y el rol antes de responder
7. POST /auth/refresh      → cuando el access_token expira, se renueva con el refresh_token
8. POST /auth/logout       → se revoca la sesión en base de datos
```

---

## Conceptos clave para recordar

| Concepto | Qué es en simple |
|---|---|
| API REST | El servidor recibe peticiones HTTP y devuelve JSON |
| JWT | Un token cifrado que identifica al usuario sin consultar la base de datos |
| Hash | Una contraseña convertida en texto ilegible que no se puede revertir |
| Módulo | Una unidad independiente de funcionalidad en NestJS |
| Guard | Un "portero" que decide si una petición puede pasar o no |
| DTO | Un molde que define qué datos se esperan recibir |
| Migración | Un cambio controlado en la estructura de la base de datos |
| Seed | Datos iniciales que se insertan en la base de datos |
| Docker | Un contenedor que corre un programa de forma aislada |
| ORM | Una capa que permite interactuar con la base de datos usando código, no SQL |
