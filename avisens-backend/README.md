# AVISENS — Backend

API REST del sistema AVISENS. Maneja la lógica de negocio, autenticación, base de datos y comunicación con dispositivos IoT.

## Estado

> **En desarrollo** — Esta carpeta se llenará en la Fase 2 del proyecto.

## Stack planeado

- **Runtime:** Node.js
- **Framework:** Express o NestJS
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Autenticación:** JWT + refresh tokens

## Endpoints planeados

| Recurso | Descripción |
|---------|-------------|
| `/auth` | Login, registro, refresh token |
| `/granjas` | CRUD de granjas y galpones |
| `/lotes` | Gestión de ciclos productivos |
| `/alertas` | Alertas y notificaciones |
| `/sensores` | Datos IoT en tiempo real |
| `/inventario` | Stock de insumos |
| `/finanzas` | Ingresos y egresos |
| `/usuarios` | Gestión de roles y permisos |
