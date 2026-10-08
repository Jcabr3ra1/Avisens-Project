<p align="center">
  <img src="avisens-frontend/src/shared/assets/logo-avisens.png" width="96" alt="Logo de AVISENS">
</p>

<h1 align="center">AVISENS</h1>
<p align="center"><strong>Gestión avícola inteligente para granjas de pollo de engorde</strong></p>

AVISENS es una plataforma web (y una app móvil en desarrollo) para que una
granja avícola lleve su día a día de forma digital: qué comieron las aves, qué
tan sano está el ambiente del galpón, y cómo va creciendo el lote frente a lo
esperado.

---

## Índice

- [Qué es AVISENS](#qué-es-avisens)
- [Qué problema resuelve y para quién](#qué-problema-resuelve-y-para-quién)
- [Qué puedes hacer con AVISENS hoy](#qué-puedes-hacer-con-avisens-hoy)
- [Un recorrido simple de la granja al lote](#un-recorrido-simple-de-la-granja-al-lote)
- [Qué existe hoy y qué está en construcción](#qué-existe-hoy-y-qué-está-en-construcción)
- [Hacia dónde va el proyecto](#hacia-dónde-va-el-proyecto)
- [Instalación y uso técnico](#instalación-y-uso-técnico)
  - [Correr todo con Docker (recomendado)](#correr-todo-con-docker-recomendado)
  - [Solo el backend, sin Docker](#solo-el-backend-sin-docker)
  - [Qué se despliega desde dónde](#qué-se-despliega-desde-dónde)
  - [Frontend web](#frontend-web)
  - [App Android](#app-android)
  - [Firmware ESP32](#firmware-esp32)
- [Calidad y flujo de colaboración](#calidad-y-flujo-de-colaboración)
- [Proyecto](#proyecto)

---

## Qué es AVISENS

**AVISENS** (Sistema Automatizado de Gestión y Monitoreo Avícola) es una
plataforma para registrar, medir y — poco a poco — predecir lo que pasa en una
granja de pollo de engorde, pensada para Colombia y Latinoamérica.

## Qué problema resuelve y para quién

Muchos productores avícolas, sobre todo pequeños y medianos, hoy llevan el
control de sus galpones en papel o en hojas de cálculo sueltas: cuánto
alimento se consumió, cuántas aves murieron, qué tan caliente o húmedo está el
ambiente. Eso dificulta detectar a tiempo un problema (un galpón que se
calienta de más, un lote que está comiendo más de lo esperado) y dificulta
comparar un ciclo productivo contra el siguiente.

AVISENS busca llevar ese control a lo digital — **registrar → medir →
predecir → recomendar** — para que esa información quede en un solo lugar,
se pueda consultar desde cualquier parte, y sirva para decidir a tiempo.

Está pensado para:

- **Propietarios** de una o varias granjas, que quieren ver cómo van sus
  galpones sin tener que estar ahí.
- **Operarios**, que son quienes registran la jornada día a día en el galpón.
- Estudiantes y formadores que usan el proyecto como caso de estudio (ver
  [Proyecto](#proyecto)).

## Qué puedes hacer con AVISENS hoy

- **Registrar la jornada** — la bitácora diaria del galpón: cuánto comieron
  las aves, cuántas murieron, eventos sanitarios y plagas. Lo registra quien
  está físicamente en el galpón (el Operario).
- **Consultar el ambiente** — si el galpón tiene sensores instalados
  (temperatura, humedad, CO₂, NH₃), sus lecturas quedan guardadas y se pueden
  comparar contra umbrales configurados, para detectar cuándo algo se sale de
  rango.
- **Seguir el crecimiento** — se calculan dos indicadores del lote:
  - **FCR** (conversión alimenticia): cuánto alimento se necesitó por cada
    kilo de pollo vivo. Más bajo es mejor.
  - **EPEF** (eficiencia productiva): un único número que combina el peso,
    la mortalidad, la edad del lote y el FCR. Más alto es mejor.

  El **peso** y el **FCR** se comparan contra una curva de referencia **por
  marca de alimento**; esa curva no trae un EPEF objetivo con el que
  comparar — el EPEF se calcula, pero hoy no tiene una meta de referencia
  propia.
- **Planificar el ciclo** — un sistema aparte, con **su propia curva por
  línea genética** (no la misma curva por marca de arriba): se elige un peso
  objetivo para el lote, el sistema **estima** un día de salida compatible
  con esa curva, y a partir de ahí **estima** cuánto alimento haría falta por
  etapa. Son estimaciones para planear — no son una garantía del resultado
  final, ni el sistema cierra el lote automáticamente.
- **Catálogo de insumos** — proveedores, insumos y tipos de alimento, con el
  consumo diario registrado por lote, como base para decidir cuánto y qué
  comprar.

## Un recorrido simple de la granja al lote

AVISENS organiza la información en tres niveles, cada uno dentro del
anterior. Este es un **ejemplo ficticio**, solo para mostrar cómo encaja todo:

```
🏠 Granja "El Progreso" (ejemplo ficticio)
 └── 🏚️  Galpón 1
      ├── 📡 Sensores de temperatura y humedad — reportan el ambiente del
      │     GALPÓN de forma continua, no dependen de qué lote esté adentro
      └── 🐣 Lote #12 — 5.000 pollos, iniciado el 1 de octubre
           ├── El Operario registra cuánto comieron y cuántos murieron,
           │     según la frecuencia operativa acordada
           └── Según esa misma frecuencia, se pesa una muestra y se compara
                 contra la curva esperada
```

Una **Granja** agrupa varios **Galpones**. Los **sensores** quedan
instalados en el **Galpón** — miden su ambiente sin importar qué lote tenga
dentro en ese momento. El **Lote**, en cambio, es lo que entra y sale de un
Galpón: nace cuando llegan las aves y se cierra cuando salen. La bitácora
(pesajes, consumos, mortalidad) y los indicadores de crecimiento quedan
asociados al **Lote**, para poder mirar un ciclo completo o compararlo con
el anterior.

## Qué existe hoy y qué está en construcción

AVISENS está en desarrollo activo como proyecto de formación. Esta tabla
distingue lo que **ya funciona** de lo que **está planeado** — para no
prometer algo que todavía no se puede mostrar:

<details open>
<summary><strong>Ver estado actual</strong></summary>

La madurez de cada pieza no es la misma: una cosa es que el código **exista**,
otra que esté **integrado** en la aplicación, otra que esté **configurado**
para usarse (claves, variables de entorno), y otra muy distinta que esté
**validado** con uso real. Esta tabla distingue esos niveles en vez de
agruparlo todo en "hecho" o "falta":

| Área | Estado |
|---|---|
| **Aplicación web** (registrar, consultar, roles por usuario) | ✅ Implementado, integrado y en uso |
| **Bitácora diaria** (pesajes, consumos, mortalidad, sanitarios, plagas) | ✅ Implementado, integrado y en uso |
| **Indicadores productivos** (FCR y EPEF calculados; peso y FCR comparados contra curva por marca, EPEF sin meta propia) | ✅ Implementado, integrado y en uso |
| **Planificación del ciclo** (peso objetivo, día de salida, alimento por etapas) | ✅ Implementado e integrado — son estimaciones; su precisión frente a resultados reales todavía no está validada con datos de campo |
| **Ingesta de sensores vía HTTP** (el backend recibe y guarda lecturas) | ✅ Implementado, integrado y en uso |
| **Clima externo como contexto** | ✅ Implementado e integrado (consulta la API pública Open-Meteo); su configuración y uso en el día a día todavía no está confirmada |
| **Recomendaciones automáticas a partir de los KPIs** | ✅ Implementado e integrado; sin validar con uso real todavía |
| **Copiloto conversacional** | ✅ Implementado e integrado (usa un modelo de lenguaje de Anthropic con herramientas); requiere una clave de API configurada, y su comportamiento en uso real aún no está validado a fondo |
| **Comandos de voz** | ✅ Implementado e integrado (interpreta y registra comandos de un vocabulario controlado, con sincronización para uso sin conexión); sin validar con uso real todavía |
| **Firmware del sensor ESP32** | 🔧 El código implementa el envío real por HTTP con token de dispositivo, pero **no hay confirmación de que se haya hecho ni siquiera una prueba física completa** (hardware real + sensor real + red real + backend real) — ni a pequeña ni a gran escala. El propio firmware tiene comentarios que dicen que el transporte (HTTP o MQTT) sigue sin decidirse del todo |
| **App Android** | 🔧 Existe una app nativa básica (inicio de sesión y parte de la bitácora); **no** es todavía la versión multiplataforma planeada, y le falta buena parte de lo que ya tiene la web |
| **Predicciones por Machine Learning** (peso, FCR, riesgo de mortalidad) | 🔧 El servicio existe y se está ajustando — sus resultados **no** se presentan todavía como una predicción validada para producción |
| **Bioacústica / visión, modo multi-granja (SaaS)** | 📋 Planeado, sin construir todavía |

</details>

## Hacia dónde va el proyecto

La idea de fondo es ir avanzando por fases, de lo más simple a lo más
ambicioso: primero que la información quede bien **registrada**, después que
se pueda **medir** (los indicadores de hoy), luego **predecir** con Machine
Learning, y más adelante **recomendar** acciones concretas — todo sin
saltarse el paso anterior ni prometer una fase antes de tenerla construida y
probada.

## Proyecto

Desarrollado como proyecto de formación **SENA** — Colombia · 2026.
Diseñado para cumplir la **Ley 1581 de 2012** de Protección de Datos
Personales de Colombia.

---

# Instalación y uso técnico

Esta sección es para quien va a **instalar, correr o contribuir** al
proyecto. Si solo querías entender qué es AVISENS, con lo de arriba basta.

## Roles del sistema

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Control total: usuarios, catálogos, curvas de referencia y auditoría |
| **Propietario** | Gestiona sus granjas, galpones, lotes y ve sus indicadores |
| **Operario** | Registra la bitácora del día (pesajes, consumos, mortalidad) en su galpón |

El alcance por rol se aplica en el servidor: cada Propietario solo ve y
gestiona **sus** propios datos.

<details>
<summary><strong>Estructura del repositorio</strong></summary>

```
Avisens-Project/
├── avisens-backend/    ← API REST (NestJS 11 + Prisma 7 + PostgreSQL)
├── avisens-frontend/   ← Aplicación web (React 19 + TypeScript + Vite)
├── avisens-android/    ← App Android nativa (Kotlin, en desarrollo)
├── esp32-firmware/     ← Firmware de los sensores IoT (ESP32 + PlatformIO)
├── database/           ← Imagen base de PostgreSQL (el esquema lo administra
│                          Prisma, no hay scripts de creación de tablas aquí)
├── bruno/              ← Colección Bruno versionada, para probar la API
└── docker-compose.yml  ← PostgreSQL + Redis + backend + frontend + ML
```

</details>

<details>
<summary><strong>Stack tecnológico</strong></summary>

| Capa | Tecnología |
|------|------------|
| **Backend** | NestJS 11, Prisma 7, PostgreSQL, TypeScript, pnpm |
| **Autenticación** | JWT (access + refresh), RBAC por rol, rate limiting, CORS, Helmet/CSP |
| **Frontend web** | React 19, TypeScript, Vite, axios |
| **App móvil** | Android nativo (Kotlin, Retrofit) — sin Compose ni Kotlin Multiplatform todavía |
| **IoT** | ESP32 + PlatformIO → HTTP con token de dispositivo → backend (sensores de temperatura, humedad, CO₂, NH₃); MQTT se evaluó pero no está integrado |
| **Contenedores** | Docker + Docker Compose |
| **Despliegue** | Railway (backend) + Vercel (frontend) |

</details>

<details>
<summary><strong>Módulos del backend (implementados)</strong></summary>

La API está versionada bajo **`/v1`** y documentada con **Swagger** (`/docs`
en desarrollo).

| Área | Módulos |
|------|---------|
| **Autenticación** | `auth` (login, refresh, logout), `usuarios` (RBAC) |
| **Estructura** | `granjas`, `galpones`, `lotes` |
| **Monitoreo IoT** | `dispositivos`, `sensores`, `mediciones`, `umbrales`, `ingest` (ESP32 por token) |
| **Catálogos** | `proveedores`, `insumos`, `tipos-alimento` |
| **Bitácora productiva** | `pesajes`, `consumos-diarios`, `registros-mortalidad`, `eventos-sanitarios`, `registros-plagas` |
| **Auditoría** | `auditoria` (log automático de acciones sensibles) |
| **Inteligencia (Fase 1)** | `indicadores` (KPIs **FCR / EPEF** / mortalidad, job `@Cron` diario), `curvas-objetivo` (curva de referencia por marca de alimento) |

</details>

## Correr todo con Docker (recomendado)

> Requiere **Bash**: Linux o macOS de forma nativa, o Windows mediante
> **WSL2** (con la integración de Docker Desktop con WSL2 activada,
> corriendo los scripts desde dentro de la distro). PowerShell y CMD no
> interpretan estos scripts; Git Bash podría, pero es un camino **no
> verificado** — ver el detalle en
> [Requisitos por sistema operativo](#requisitos-por-sistema-operativo).

**Preparación inicial (solo la primera vez):**

```bash
./scripts/dev-setup.sh
```

Esto crea el `.env` de la raíz si no existe (nunca lo sobrescribe si ya está),
genera los secretos con `openssl` y los escribe directo en el archivo —
**nunca los imprime** — con permisos restrictivos (`chmod 600`). Si detecta
que ya hay una base de datos con datos de una instalación anterior pero falta
el `.env`, se detiene y explica cómo recuperar la configuración, en vez de
generar una contraseña nueva que no coincidiría con la que esa base ya tiene.

Este `.env` de la raíz es la **única fuente** de estas variables para todo lo
que corre con `docker compose` — backend, frontend y microservicio de ML
incluidos. `avisens-backend/.env` es un archivo aparte, que solo hace falta si
además vas a correr el backend **sin** Docker (ver
[Solo el backend, sin Docker](#solo-el-backend-sin-docker)); no se lee dentro
del contenedor, así que editarlo no cambia nada mientras usas Compose.

Para terminar la preparación (levantar el stack y crear el admin — **el seed
ya no corre solo en cada arranque**, es un paso explícito):

```bash
./scripts/dev-up.sh
docker compose exec backend pnpm run seed
```

> ⚠️ **Los secretos no están en el repositorio.** `docker-compose.yml` los
> exige por variable de entorno y se niega a arrancar si faltan.
> `./scripts/dev-setup.sh` ya los genera; si prefieres hacerlo a mano:
> ```bash
> openssl rand -base64 48 | tr -d '\n/+=' | head -c 48
> ```
> `JWT_SECRET` y `JWT_REFRESH_SECRET` deben tener 32 caracteres como mínimo y
> ser **distintos entre sí**: si fueran iguales, un refresh token valdría
> como token de acceso.

| Servicio | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend / Swagger | http://localhost:3000/docs |
| Microservicio ML | *(no publicado al host; solo accesible dentro de la red de Docker, p. ej. con `docker compose exec ml ...` o desde el backend)* |
| PostgreSQL | 127.0.0.1:5433 (usuario `avisens`, solo accesible desde esta máquina) |

Eso levanta PostgreSQL, Redis, el backend, el frontend y el microservicio de
ML. El backend migra la base solo en cada arranque (siempre, es idempotente)
— sembrar roles y admin es aparte, nunca automático, ver arriba. En
desarrollo el backend corre en modo *watch*: al guardar un archivo se
recompila solo, sin `--build`.

> ⚠️ **¿Las credenciales de admin no funcionan después de clonar de nuevo?**
> Clonar el repositorio no borra los volúmenes de Docker — si ya habías
> intentado levantar el proyecto antes en esta máquina, el volumen de
> Postgres (y el admin que tenga adentro, con otra contraseña) sigue ahí; el
> seed nunca sobrescribe un usuario que ya existe. Dos arreglos, de menos a
> más destructivo:
>
> 1. **Recuperación autorizada, sin perder el usuario ni su historial**:
>    actualiza solo la contraseña del admin que ya existe —el mismo
>    registro, el mismo `id`, toda su auditoría y referencias intactas— en
>    vez de borrarlo y re-sembrarlo:
>    ```bash
>    hash=$(docker compose exec -T backend node -e \
>      "require('bcrypt').hash(process.env.ADMIN_PASSWORD, 12).then(h => process.stdout.write(h))")
>    docker compose exec database psql -U avisens -d avisens -c \
>      "UPDATE usuarios SET password_hash='$hash' WHERE email='admin@avisens.com';"
>    ```
>    Usa el mismo algoritmo y costo (`bcrypt`, 12 rondas) que ya usa el seed
>    real — no agrega lógica de autenticación nueva, solo reutiliza la
>    existente para igualar la contraseña guardada con el `ADMIN_PASSWORD`
>    de tu `.env`.
> 2. **Si de verdad quieres empezar de cero** (operación **destructiva** —
>    borra TODOS los datos de desarrollo de este proyecto, no solo el
>    admin):
>    ```bash
>    docker compose down -v
>    ./scripts/dev-up.sh
>    docker compose exec backend pnpm run seed
>    ```

<details>
<summary><strong>Más comandos del día a día</strong> (estado, logs, detener, migrar/sembrar sin reiniciar, actualizar tras cambios de Dockerfile)</summary>

**Ciclo diario**, una vez ya está preparado:

```bash
./scripts/dev-up.sh           # iniciar con espera acotada: no vuelve hasta que
                               # todo está "healthy", o falla con un mensaje claro
docker compose ps             # ver estado
docker compose logs -f        # ver logs de todos los servicios
docker compose logs -f backend   # ver logs de uno solo
docker compose down           # detener, SIN borrar datos (los volúmenes quedan)
docker compose down -v        # ⚠️ detener Y BORRAR la base — solo si quieres empezar de cero
```

Si necesitas migrar o re-sembrar **sin** reiniciar todo el stack (por
ejemplo, tras cambiar `schema.prisma` en caliente):

```bash
docker compose exec backend pnpm prisma migrate deploy
docker compose exec backend pnpm run seed
```

**Actualizar una instalación ya existente tras cambios en algún
`Dockerfile`** (por ejemplo, un healthcheck nuevo o una dependencia del
sistema agregada a la imagen): reconstruye solo las imágenes afectadas y
vuelve a levantar — `dev-up.sh` reutiliza los contenedores ya construidos si
nada cambió, así que el `build` explícito es necesario para que el cambio de
imagen se note:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml build backend frontend
./scripts/dev-up.sh
```

Reconstruir imágenes **no borra los volúmenes** — los datos de Postgres y
Redis quedan intactos, igual que el admin ya sembrado. **No hace falta
`down -v`** para esto: ese comando es para empezar de cero, no para aplicar
un cambio de imagen.

</details>

<details id="requisitos-por-sistema-operativo">
<summary><strong>Requisitos por sistema operativo</strong></summary>

Los scripts (`dev-setup.sh`, `dev-up.sh`, los de `scripts/tests/`) son `.sh`
y necesitan **Bash**. PowerShell y CMD no interpretan scripts de shell de
forma nativa, así que quedan fuera directamente:

| Sistema | Qué necesitas | Estado |
|---|---|---|
| **Linux** | Bash + Docker + OpenSSL instalados | Compatible previsto — mismas herramientas que macOS, no probado en esta sesión |
| **macOS** | Bash (del sistema) + Docker Desktop instalado + OpenSSL | **Probado**: es donde se verificaron todos los escenarios de esta guía |
| **Windows** | **WSL2**, con la integración de Docker Desktop con WSL2 activada, y correr los scripts **desde dentro de la distro WSL2** | Comprobado parcialmente: preparación y arranque, en una máquina con Ubuntu/WSL2 |

**Windows con WSL2**: preparación y arranque comprobados parcialmente en una
máquina del usuario (Ubuntu sobre WSL2, clonando `develop`): `dev-setup.sh`
terminó bien y `dev-up.sh` dejó los cinco servicios `healthy`. **Seed y login
quedan pendientes de verificación** ahí. Esto no valida todas las
distribuciones de WSL2 ni el arranque nativo desde PowerShell.

**Git Bash** trae su propio `bash.exe` y en principio podría interpretar
estos scripts, pero es un **camino no verificado**: no se probó con ellos,
así que no hay garantía de que las primitivas que usan (`mktemp`, `ln`,
señales, `docker volume`/`network ls` con filtros) se comporten igual ahí.
No se afirma que no funcione — solo que no está comprobado.

</details>

<details>
<summary><strong>Pruebas del entorno Docker</strong> (para quien mantiene estos scripts)</summary>

Dos scripts de verificación, cada uno en un stack 100% desechable y separado
del real (nombre de proyecto único por corrida, sin puertos publicados, sin
tocar nunca `avisens-project` ni sus volúmenes):

```bash
./scripts/test-persistencia.sh        # prueba que "down" sin -v conserva los datos
./scripts/test-instalacion-limpia.sh  # instalacion limpia del stack completo (los 5
                                       # servicios) + seed explicito + login real
```

El segundo tarda varios minutos (construye las 4 imágenes). Ninguno de los
dos demuestra lógica de negocio de cada servicio — solo que arrancan sanos
(`healthy`) y, en el segundo caso, que el camino de autenticación funciona de
punta a punta tras el seed.

Tres pruebas más, rápidas y sin tocar Docker de verdad (salvo un volumen
desechable puntual), que ejercitan `dev-setup.sh` y `dev-up.sh` directamente
contra carpetas/variables aisladas:

```bash
./scripts/tests/test-dev-setup.sh      # instalación nueva, .env existente
                                        # intacto, segunda corrida, volumen
                                        # poblado sin .env, Docker inaccesible,
                                        # fallo de openssl, SIGKILL a mitad de
                                        # la generación y durante la
                                        # publicación atómica, concurrencia
./scripts/tests/test-dev-up-dry-run.sh # confirma con AVISENS_DRY_RUN=1 que el
                                        # camino real por defecto resuelve
                                        # development/target dev/bind mounts/
                                        # loopback:5433 -- sin arrancar nada
./scripts/tests/test-limpieza-docker-inaccesible.sh # confirma que, si Docker
                                        # no responde, la limpieza de los dos
                                        # scripts de arriba falla de forma
                                        # observable -- nunca reporta "nada
                                        # que limpiar" en silencio
```

</details>

## Solo el backend, sin Docker

Este camino usa su **propio** `.env`, independiente del de la raíz — edítalo
aquí, no en el de arriba:

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

> ⚠️ Genera secretos JWT fuertes con `openssl rand -base64 48`. Nunca subas
> el `.env`.

## Qué se despliega desde dónde

<details open>
<summary><strong>Ver detalle de despliegue</strong></summary>

| | Despliega desde | Se ve en |
|---|---|---|
| Backend | Railway, rama `main` | avisens-project-production.up.railway.app |
| Frontend | Vercel, rama `main` | avisens-project.vercel.app |

**Los dos leen `main`, no `develop`.** Lo que se mergea a `develop` no llega
a producción hasta que pasa a `main` — es el motivo más común de «desplegué y
sigo viendo lo viejo».

Y las **preguntas del chatbot viven en la base de datos**, no en el código:
producción tiene `RUN_SEED=false`, así que cambiarlas exige correr el seed
una vez, no basta con desplegar.

**Desplegar el frontend en Vercel.** El frontend va en Vercel y el backend
en Railway. Al crear el proyecto:

| Ajuste | Valor |
|---|---|
| Root Directory | `avisens-frontend` |
| Framework | Vite (lo detecta solo) |
| Variable de entorno | `VITE_API_URL` = `https://<tu-backend>.up.railway.app/v1` |

**Y hay que abrir el CORS en Railway**, o el navegador bloquea todas las
llamadas y el chat deja de funcionar:

```
CORS_ORIGIN=http://localhost:5173,http://localhost:8080,https://avisens-project.vercel.app,https://avisens-project-*.vercel.app
```

El tercero, con comodín, cubre las previsualizaciones: Vercel crea un
subdominio distinto en cada despliegue de rama. Sin él, cada
previsualización tendría el chat roto, y el fallo solo se ve en la consola
del navegador — nunca en los logs del servidor.

> En local no hace falta nada de esto: nginx reenvía `/api` al backend por
> la red interna de Docker, así que el navegador nunca cruza de dominio.

</details>

## Frontend web

```bash
cd avisens-frontend
cp .env.example .env          # VITE_API_URL apuntando al backend
npm install
npm run dev
```

## App Android

App nativa en Kotlin (no es Kotlin Multiplatform ni usa Compose por ahora —
ver [Qué existe hoy y qué está en construcción](#qué-existe-hoy-y-qué-está-en-construcción)):

```bash
cd avisens-android
./gradlew :app:assembleDebug
```

## Firmware ESP32

```bash
cd esp32-firmware
pio run                       # compilar
pio run -t upload             # cargar al dispositivo
```

El código implementa el envío por **HTTP** (POST con un token de dispositivo
en la cabecera), no por MQTT. El propio archivo (`esp32-firmware/src/main.cpp`)
tiene comentarios que describen esto como pendiente de decidir — están
desactualizados frente al código real, pero reflejan que **no hay
confirmación de una prueba física completa** (hardware, sensor, red y
backend reales) todavía.

## Calidad y flujo de colaboración

Todo cambio debe **demostrar que funciona** antes de considerarse terminado:
pruebas de la lógica riesgosa (`jest`), *gates* en verde (`tsc --noEmit` +
`eslint` + `jest` en backend, `build` en frontend) y una demo real de la
ruta. El **CI de GitHub Actions** hace cumplir estos gates en cada push y
Pull Request.

Flujo de trabajo: rama por funcionalidad → Pull Request a `develop` → *checks*
en verde y revisión → merge. **Nada se empuja directo a `develop`** — ni
siquiera un cambio pequeño con los gates en verde. `main` solo recibe merges
desde `develop`. El detalle completo (incluida la convención de commits) está
en [`FLUJO-DE-TRABAJO.md`](FLUJO-DE-TRABAJO.md).

---

> Repositorio oficial de AVISENS. En desarrollo activo.
