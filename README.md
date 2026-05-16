# AVISENS — Gestión Avícola Inteligente

**AVISENS** (Sistema Automatizado de Gestión y Monitoreo Avícola) es una plataforma SaaS integral para la gestión, monitoreo y automatización de granjas avícolas en Colombia y Latinoamérica.

## ¿Qué problema resuelve?

Los avicultores colombianos enfrentan alta mortalidad de aves por falta de monitoreo ambiental continuo, registros manuales propensos a errores, poca visibilidad financiera del ciclo productivo y procesos comerciales lentos. AVISENS automatiza todo ese flujo — desde la captación de clientes hasta el mantenimiento predictivo de infraestructura — con el objetivo de reducir la mortalidad avícola del 3% al 0,72%.

## ¿Para quién es?

| Rol | Descripción |
|-----|-------------|
| Administrador | Gestiona CRM, dashboards, reportes financieros y usuarios |
| Usuario / Supervisor | Monitorea el estado ambiental y consolida reportes del ciclo productivo |
| Operario | Registra bitácora y gestiona alertas en campo, principalmente por voz |

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Chatbot de cotización | Califica prospectos, genera cotizaciones en PDF y administra el pipeline de ventas |
| Asistente de voz AVIA | Registro de bitácora y consultas ambientales por voz, manos libres, con soporte offline |
| Monitoreo ambiental | Dashboards en tiempo real de temperatura, humedad, CO₂ y NH₃ con sensores IoT |
| Motor de alertas | Alertas multicanal (push, correo, WhatsApp) con escalamiento automático por jerarquía |
| Bitácora productiva | Registro digital de peso del lote, mortalidad y consumo por ciclo |
| Finanzas e inventario | Costos por ciclo, gestión de insumos, proveedores y reporte financiero |
| Mantenimiento predictivo | Mapa digital de la granja, seguimiento de equipos críticos y predicción de fallas |
| Autenticación y roles | JWT, MFA para administradores y control de acceso basado en roles (RBAC) |

## Estructura del Proyecto

```
Avisens-Project/
├── avisens-frontend/     ← Aplicación web (React 19 + TypeScript + Vite)
├── avisens-android/      ← App multiplataforma (Kotlin Multiplatform + Compose)
├── avisens-backend/      ← API REST (Go + Fiber) — en desarrollo
└── avisens-api-gateway/  ← API Gateway — fase futura
```

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Frontend web | React 19, TypeScript, Vite, Tailwind CSS |
| App móvil / escritorio | Kotlin Multiplatform, Compose Multiplatform |
| Plataformas móviles | Android, iOS |
| Backend | Go, Fiber, PostgreSQL, Redis |
| Autenticación | JWT + refresh tokens |
| IoT | ESP32, sensores de temperatura / humedad / CO₂ / NH₃ |
| Contenedores | Docker + Docker Compose |

## Correr localmente

**Frontend web**
```bash
cd avisens-frontend
npm install
npm run dev
```

**Backend**
```bash
cd avisens-backend
docker compose up        # levanta PostgreSQL + Redis
go run cmd/main.go
```

**App Android**
```bash
cd avisens-android
./gradlew :app:androidApp:assembleDebug
```

**App Desktop**
```bash
cd avisens-android
./gradlew :app:desktopApp:run
```

## Proyecto

Desarrollado como proyecto SENA — Cauca, Colombia · 2026

Cumple con la **Ley 1581 de 2012** de Protección de Datos Personales de Colombia.

---

> Repositorio oficial de AVISENS. En desarrollo activo.
