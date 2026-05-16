# AVISENS — Gestión Avícola Inteligente

Plataforma SaaS de monitoreo avícola con IoT en tiempo real para Colombia y Latinoamérica.

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
|------|-----------|
| Frontend web | React 19, TypeScript, Vite, Tailwind CSS |
| App móvil / escritorio | Kotlin Multiplatform, Compose Multiplatform |
| Plataformas móviles | Android, iOS |
| Backend | Go, Fiber, PostgreSQL, Redis |
| Autenticación | JWT + refresh tokens |
| IoT | ESP32, sensores de temperatura / humedad / CO₂ / NH₃ |
| Contenedores | Docker + Docker Compose |

## Módulos

- Monitoreo ambiental en tiempo real
- Sistema de alertas con Health Score™
- Bitácora productiva con registro por voz
- Gestión de inventario y finanzas
- CRM de prospectos
- Asistente IA AVIA

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

---

> Repositorio oficial de AVISENS. En desarrollo activo.
