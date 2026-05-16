# AVISENS — API Gateway

Capa de entrada centralizada para todos los servicios de AVISENS. Gestiona autenticación, rate limiting, routing y logging.

## Estado

> **Fase futura** — Se implementará cuando el sistema escale a múltiples servicios.

## Stack

- **Gateway:** Nginx o servicio Go liviano *(por definir)*
- **Autenticación:** Validación de JWT centralizada
- **Rate limiting:** Protección contra abuso de la API
- **Logging:** Registro centralizado de peticiones

## Responsabilidades

- **Autenticación centralizada** — Validar JWT antes de pasar al backend
- **Rate limiting** — Evitar abuso de la API
- **Routing** — Redirigir requests al microservicio correcto
- **Logging** — Registro centralizado de todas las peticiones
- **CORS** — Control de acceso entre dominios

## Flujo

```
Frontend → API Gateway → avisens-backend (monolito)
                       → servicio-iot (futuro)
                       → servicio-notificaciones (futuro)
```
