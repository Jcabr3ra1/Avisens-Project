# Despliegue del backend en Railway

Guía paso a paso para publicar `avisens-backend` en Railway. El proyecto es un
**monorepo** (backend, frontend y base de datos en un mismo repo), así que la clave
es decirle a Railway que el backend vive en la carpeta `avisens-backend/`.

> **URL actual:** https://avisens-project-production.up.railway.app
> (Swagger en `/docs`, health en `/health`).

---

## Requisitos previos

- El código debe estar en **GitHub** (Railway construye desde el repo o desde una
  subida local).
- El backend ya trae lo necesario para producción:
  - `avisens-backend/Dockerfile` — build multi-etapa.
  - `avisens-backend/docker-entrypoint.sh` — aplica `prisma migrate deploy` al
    arrancar y luego lanza la app. **Las migraciones se aplican solas en cada deploy.**
- Variables de entorno que la app **exige** (ver `src/config/env.validation.ts`):

  | Variable | Obligatoria | Valor |
  |----------|-------------|-------|
  | `DATABASE_URL` | ✅ | la da el Postgres de Railway |
  | `JWT_SECRET` | ✅ (≥32 chars) | secreto aleatorio |
  | `JWT_REFRESH_SECRET` | ✅ (≥32 chars) | otro secreto aleatorio |
  | `CORS_ORIGIN` | ✅ en producción | dominio del frontend (o `*` temporal) |
  | `JWT_EXPIRES_IN` | opcional | `15m` |
  | `JWT_REFRESH_EXPIRES_IN` | opcional | `7d` |
  | `RUN_SEED` | opcional | `true` crea el admin al arrancar |
  | `PORT` | ❌ no ponerla | Railway la inyecta sola |

Para generar secretos:

```bash
openssl rand -hex 32
```

---

## Opción A — Dashboard (web)

1. **Crear cuenta** en [railway.com](https://railway.com) → *Login with GitHub*.
2. **New Project** → *Deploy from GitHub repo* → elegir `Avisens-Project`.
3. En el servicio → **Settings → Source**:
   - **Root Directory** = `avisens-backend`  ← *imprescindible en el monorepo*.
   - (Opcional) **Watch Paths** = `avisens-backend/**` (redespliega solo si cambia el backend).
4. **+ New → Database → Add PostgreSQL**.
5. En el backend → **Variables → Raw Editor** (modo JSON), pegar:

   ```json
   {
     "DATABASE_URL": "${{Postgres.DATABASE_URL}}",
     "JWT_SECRET": "<secreto-1>",
     "JWT_REFRESH_SECRET": "<secreto-2>",
     "JWT_EXPIRES_IN": "15m",
     "JWT_REFRESH_EXPIRES_IN": "7d",
     "CORS_ORIGIN": "*",
     "RUN_SEED": "true"
   }
   ```

   > `${{Postgres.DATABASE_URL}}` es una **referencia**: apunta al servicio Postgres.
   > Si tu servicio de BD tiene otro nombre, cámbialo ahí.

6. Al guardar, Railway **redespliega solo**.
7. **Settings → Networking → Generate Domain** (puerto **8080**) → obtienes la URL pública.

---

## Opción B — CLI (terminal)

Es la que usamos. Útil para automatizar y para desplegar sin depender del dashboard.

```bash
# 1. Instalar y entrar
brew install railway
railway login                       # abre el navegador una vez

# 2. Vincular el repo a un proyecto de Railway
cd avisens-backend
railway link -p <nombre-del-proyecto>

# 3. Crear la base de datos
railway add --database postgres

# 4. Poner las variables (¡DATABASE_URL entre comillas SIMPLES!)
railway variables -s Avisens-Project \
  --set 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --set 'JWT_SECRET=<secreto-1>' \
  --set 'JWT_REFRESH_SECRET=<secreto-2>' \
  --set 'JWT_EXPIRES_IN=15m' \
  --set 'JWT_REFRESH_EXPIRES_IN=7d' \
  --set 'CORS_ORIGIN=*' \
  --set 'RUN_SEED=true'

# 5. Desplegar la carpeta actual (usa el Dockerfile de avisens-backend)
railway up --service Avisens-Project

# 6. Generar el dominio público (puerto 8080)
railway domain -s Avisens-Project --port 8080
```

> **`railway up`** sube la carpeta actual como contexto de build; por eso hay que
> correrlo **dentro de `avisens-backend`** y así no depende del "Root Directory".
> Si en cambio quieres **auto-deploy en cada `git push`**, usa la conexión con GitHub
> (Opción A, paso 3) y fija el Root Directory.

---

## Redesplegar tras hacer cambios

- **Si desplegaste con `railway up`** (subida local):
  ```bash
  cd avisens-backend
  railway up --service Avisens-Project
  ```
- **Si conectaste GitHub con Root Directory configurado:**
  ```bash
  git push        # Railway detecta el push y redespliega solo
  ```

En ambos casos, si agregaste tablas nuevas, **las migraciones se aplican solas** al
arrancar (el entrypoint corre `prisma migrate deploy`). Solo asegúrate de haber
**commiteado la carpeta `prisma/migrations/`**.

---

## Comandos útiles de diagnóstico

```bash
railway status                       # estado del proyecto y servicios
railway logs -s Avisens-Project      # logs de la app (runtime)
railway logs -s Avisens-Project --build   # logs del build
railway variables -s Avisens-Project      # ver variables
railway domain list -s Avisens-Project    # ver dominios
```

---

## Problemas comunes (y lo que significan)

| Síntoma en los logs | Causa | Solución |
|---------------------|-------|----------|
| `Failed to build an image` | Railway construye desde la raíz del repo, no encuentra el Dockerfile | Fijar **Root Directory = `avisens-backend`** (o usar `railway up` dentro de esa carpeta) |
| `DATABASE_URL no está definida` | No hay Postgres, o la referencia `${{Postgres.DATABASE_URL}}` no resuelve (nombre distinto) | Crear el Postgres y verificar el nombre del servicio en la referencia |
| `CORS_ORIGIN es obligatoria en producción` | Falta esa variable (el Dockerfile fija `NODE_ENV=production`) | Definir `CORS_ORIGIN` |
| `Variables de entorno inválidas` | Falta un secreto o mide <32 chars | Revisar `JWT_SECRET` / `JWT_REFRESH_SECRET` |

> ⚠️ **Ojo con la CLI:** para borrar un servicio usa **`railway service delete -s <nombre> --yes`**.
> Pasar el nombre como argumento suelto NO funciona: borra el servicio *vinculado*.

---

## Pendientes de endurecimiento (producción real)

- [ ] Fijar **Root Directory** en el dashboard para auto-deploy en `git push`.
- [ ] Cerrar **`CORS_ORIGIN`** al dominio real del frontend (no `*`).
- [ ] Poner **`RUN_SEED=false`** una vez creado el admin.
- [ ] Desplegar el **frontend** (Vercel, o como 2º servicio en Railway).
