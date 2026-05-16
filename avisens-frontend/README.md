# AVISENS — Frontend

Interfaz web del sistema AVISENS. Panel de control para monitoreo de sensores IoT, alertas, granjas, inventario y finanzas.

## Estado

> **En desarrollo** — Fase 1 activa.

## Stack

- **Framework:** React 19
- **Lenguaje:** TypeScript
- **Build tool:** Vite
- **Routing:** React Router DOM v7
- **UI components:** Shadcn/UI + Tailwind CSS *(por agregar)*
- **HTTP / Data fetching:** TanStack Query + Axios *(por agregar)*
- **Estado global:** Zustand *(por agregar)*
- **Gráficas IoT:** Recharts *(por agregar)*

## Módulos

| Módulo | Descripción |
|---|---|
| `/dashboard` | Panel principal con resumen del sistema |
| `/granjas` | Gestión de granjas y galpones |
| `/monitoreo` | Datos en tiempo real de sensores |
| `/alertas` | Alertas y notificaciones |
| `/inventario` | Stock de insumos |
| `/finanzas` | Ingresos y egresos |
| `/usuarios` | Gestión de roles y permisos |
| `/bitacora` | Registro de actividad |
| `/crm` | Gestión de clientes |

## Correr localmente

```bash
npm install
npm run dev
```
