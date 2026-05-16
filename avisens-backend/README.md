# AVISENS — Backend

API REST del sistema AVISENS. Maneja la lógica de negocio, autenticación, base de datos y comunicación con dispositivos IoT.

## Estado

> **En desarrollo** — Fase 2 del proyecto.

## Stack

- **Lenguaje:** Go
- **Framework:** Fiber
- **Base de datos:** PostgreSQL
- **ORM:** SQLC + pgx
- **Caché / Tiempo real:** Redis
- **Autenticación:** JWT + refresh tokens
- **Contenedores:** Docker + Docker Compose

## Endpoints planeados

| Recurso | Descripción |
|---|---|
| `/auth` | Login, registro, refresh token |
| `/granjas` | CRUD de granjas y galpones |
| `/lotes` | Gestión de ciclos productivos |
| `/alertas` | Alertas y notificaciones |
| `/sensores` | Datos IoT en tiempo real |
| `/inventario` | Stock de insumos |
| `/finanzas` | Ingresos y egresos |
| `/usuarios` | Gestión de roles y permisos |

## Correr localmente

```bash
docker compose up        # levanta PostgreSQL + Redis
go run cmd/main.go       # corre el servidor
```
