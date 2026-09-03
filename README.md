# AVISENS — Gestión Avícola Inteligente

**AVISENS** (Sistema Automatizado de Gestión y Monitoreo Avícola) es una plataforma para la gestión, monitoreo e inteligencia de granjas avícolas de pollo de engorde en Colombia y Latinoamérica.

## ¿Qué problema resuelve?

Los avicultores colombianos enfrentan alta mortalidad de aves por falta de monitoreo ambiental continuo, registros manuales propensos a errores y poca visibilidad de la eficiencia del ciclo productivo. AVISENS lleva ese flujo a lo digital — registrar → medir → **predecir** → recomendar — con el objetivo de reducir la mortalidad avícola y mejorar la conversión alimenticia (FCR).

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Control total: usuarios, catálogos, curvas de referencia y auditoría |
| **Propietario** | Gestiona sus granjas, galpones, lotes y ve sus indicadores |
| **Operario** | Registra la bitácora del día (pesajes, consumos, mortalidad) en su galpón |

El alcance por rol se aplica en el servidor: cada Propietario solo ve y gestiona **sus** propios datos.

## Estructura del repositorio

```
Avisens-Project/
├── avisens-backend/    ← API REST (NestJS 11 + Prisma 7 + PostgreSQL)
├── avisens-frontend/   ← Aplicación web (React 19 + TypeScript + Vite)
├── avisens-android/    ← App móvil (Kotlin Multiplatform + Compose)
├── esp32-firmware/     ← Firmware de los sensores IoT (ESP32 + PlatformIO)
├── database/           ← Scripts e init de la base de datos
├── postman/            ← Colección Postman para probar la API (local, ignorada)
└── docker-compose.yml  ← PostgreSQL + backend + frontend
```

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| **Backend** | NestJS 11, Prisma 7, PostgreSQL, TypeScript, pnpm |
| **Autenticación** | JWT (access + refresh), RBAC por rol, rate limiting, CORS, Helmet/CSP |
| **Frontend web** | React 19, TypeScript, Vite, axios |
| **App móvil** | Kotlin Multiplatform, Compose Multiplatform (Android) |
| **IoT** | ESP32 + PlatformIO → MQTT → backend (sensores de temperatura, humedad, CO₂, NH₃) |
| **Contenedores** | Docker + Docker Compose |
| **Despliegue** | Railway (backend en producción) |

## Módulos del backend (implementados)

La API está versionada bajo **`/v1`** y documentada con **Swagger** (`/docs` en desarrollo).

| Área | Módulos |
|------|---------|
| **Autenticación** | `auth` (login, refresh, logout), `usuarios` (RBAC) |
| **Estructura** | `granjas`, `galpones`, `lotes` |
| **Monitoreo IoT** | `dispositivos`, `sensores`, `mediciones`, `umbrales`, `ingest` (ESP32 por token) |
| **Catálogos** | `proveedores`, `insumos`, `tipos-alimento` |
| **Bitácora productiva** | `pesajes`, `consumos-diarios`, `registros-mortalidad`, `eventos-sanitarios`, `registros-plagas` |
| **Auditoría** | `auditoria` (log automático de acciones sensibles) |
| **Inteligencia (Fase 1)** | `indicadores` (KPIs **FCR / EPEF** / mortalidad, job `@Cron` diario), `curvas-objetivo` (curva de referencia por marca de alimento) |

### Capa de inteligencia — roadmap (EP-09)

De *registrar y medir* a *predecir y recomendar*, por fases:

1. **KPIs** — indicadores productivos del lote (FCR, EPEF…). ✅ *hecho*
2. **Clima** — job que trae el clima externo como contexto. *en curso*
3. **Predicciones (ML)** — servicio Python que predice peso, FCR y riesgo de mortalidad.
4. **Recomendaciones** — acciones sugeridas a partir de los datos.
5. **Copiloto IA + voz** · **6. Bioacústica / visión** · **7. SaaS multi-organización**.

## Correr localmente

### Todo el sistema con Docker (recomendado)

```bash
./scripts/preparar-entorno.sh   # crea el .env y genera los secretos
docker compose up -d --build
```

El script se puede correr las veces que haga falta: **nunca pisa un valor que
ya tengas puesto**. Solo rellena lo que falta, así que también sirve para
ponerse al día cuando alguien añade una variable nueva al proyecto.

Existe porque `docker compose` corta en la **primera** variable que le falta.
Sin el script se descubren de una en una: arreglas `POSTGRES_PASSWORD`, vuelves
a correr y aparece `ML_INTERNAL_TOKEN`. Son cuatro secretos, o sea cuatro
vueltas. Si prefieres hacerlo a mano, `cp .env.example .env` y rellenas los
cuatro marcados como OBLIGATORIOS.

Eso levanta PostgreSQL, Redis, el backend, el frontend y el microservicio de ML.
El backend migra la base y la siembra solo, así que al terminar ya hay un admin
para entrar:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend / Swagger | http://localhost:3000/docs |
| Microservicio ML | http://localhost:8000/health |
| PostgreSQL | localhost:5433 (usuario `avisens`) |

En desarrollo el backend corre en modo *watch*: al guardar un archivo se
recompila solo, sin `--build`.

**Los secretos no están en el repositorio.** `docker-compose.yml` los exige por
variable de entorno y se niega a arrancar si faltan, con un mensaje que dice
cuál. Genera cada uno así:

```bash
openssl rand -base64 48 | tr -d '\n/+=' | head -c 48
```

`JWT_SECRET` y `JWT_REFRESH_SECRET` deben tener 32 caracteres como mínimo y ser
**distintos entre sí**: si fueran iguales, un refresh token valdría como token
de acceso.

### Solo el backend, sin Docker (NestJS + PostgreSQL)

```bash
# 1. Levantar PostgreSQL (desde la raíz del repo)
docker compose up -d database

# 2. Configurar y arrancar el backend
cd avisens-backend
cp .env.example .env          # completa DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ADMIN_*
pnpm install
pnpm prisma migrate deploy    # aplica el esquema
pnpm run seed                 # crea roles, admin y las curvas de referencia
pnpm start:dev                # http://localhost:3000  (Swagger en /docs)
```

> Genera secretos JWT fuertes con `openssl rand -base64 48`. Nunca subas el `.env`.

### Qué se despliega desde dónde

| | Despliega desde | Se ve en |
|---|---|---|
| Backend | Railway, rama `main` | avisens-project-production.up.railway.app |
| Frontend | Vercel, rama `main` | avisens-project.vercel.app |

**Los dos leen `main`, no `develop`.** Lo que se mergea a `develop` no llega a
producción hasta que pasa a `main` — es el motivo más común de «desplegué y sigo
viendo lo viejo».

Y las **preguntas del chatbot viven en la base de datos**, no en el código:
producción tiene `RUN_SEED=false`, así que cambiarlas exige correr el seed una
vez, no basta con desplegar.

### Desplegar el frontend en Vercel

El frontend va en Vercel y el backend en Railway. Al crear el proyecto:

| Ajuste | Valor |
|---|---|
| Root Directory | `avisens-frontend` |
| Framework | Vite (lo detecta solo) |
| Variable de entorno | `VITE_API_URL` = `https://<tu-backend>.up.railway.app/v1` |

Desplegado en **https://avisens-project.vercel.app**, y el backend en
`https://avisens-project-production.up.railway.app`.

**Y hay que abrir el CORS en Railway**, o el navegador bloquea todas las llamadas
y el chat deja de funcionar:

```
CORS_ORIGIN=http://localhost:5173,http://localhost:8080,https://avisens-project.vercel.app,https://avisens-project-*.vercel.app
```

El tercero, con comodín, cubre las previsualizaciones: Vercel crea un subdominio
distinto en cada despliegue de rama. Sin él, cada previsualización tendría el
chat roto, y el fallo solo se ve en la consola del navegador — nunca en los logs
del servidor.

> En local no hace falta nada de esto: nginx reenvía `/api` al backend por la red
> interna de Docker, así que el navegador nunca cruza de dominio.

### Frontend web (React + Vite)

```bash
cd avisens-frontend
cp .env.example .env          # VITE_API_URL apuntando al backend
npm install
npm run dev
```

### App Android (Kotlin Multiplatform)

```bash
cd avisens-android
./gradlew :app:assembleDebug
```

### Firmware ESP32 (PlatformIO)

```bash
cd esp32-firmware
pio run                       # compilar
pio run -t upload             # cargar al dispositivo
```

## Calidad

Todo cambio debe **demostrar que funciona** antes de considerarse terminado: pruebas de la lógica riesgosa (`jest`), *gates* en verde (`tsc --noEmit` + `eslint` + `jest` en backend, `build` en frontend) y una demo real de la ruta. El **CI de GitHub Actions** hace cumplir estos gates en cada push y Pull Request.

Flujo de trabajo: **GitHub Flow** — rama por funcionalidad → Pull Request → CI en verde → *squash merge*. Nunca push directo a `main`.

## Proyecto

Desarrollado como proyecto de formación **SENA** — Colombia · 2026.
Diseñado para cumplir la **Ley 1581 de 2012** de Protección de Datos Personales de Colombia.

---

> Repositorio oficial de AVISENS. En desarrollo activo.
