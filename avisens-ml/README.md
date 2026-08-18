# Avisens ML — Microservicio de predicciones

Servicio de **predicción de crecimiento** de lotes de pollo de engorde. Es un
microservicio **independiente** del backend: recibe los pesajes de un lote y
proyecta su crecimiento a futuro.

Forma parte de la arquitectura de microservicios de Avisens:

```
Frontend (React)
      │
Backend (NestJS)  ──HTTP──►  Avisens ML (este servicio, Python)
      │                            └─ numpy: regresión sobre los pesajes
Base de datos (PostgreSQL)
```

## Stack

- **Python 3.12**
- **FastAPI** — el framework web (expone la API).
- **Uvicorn** — el servidor que corre FastAPI.
- **NumPy** — el cálculo numérico: ajusta la curva de crecimiento (regresión).
- **Pydantic** — valida los datos de entrada.

## Qué hace (el modelo)

No es una red neuronal: es una **regresión polinomial de grado 2** (una parábola).
El crecimiento del pollo (peso vs. día) es una curva suave, así que se ajusta una
parábola a los pesajes reales del lote con `numpy.polyfit`, y con ese modelo se
proyecta:

1. **`peso_proyectado_faena_g`** — cuánto pesará al día de faena (por defecto, día 42).
2. **`dias_al_objetivo`** — en cuántos días alcanzará el peso meta (por defecto, 2500 g).

> Requiere al menos **3 pesajes** en **días distintos** (con menos puntos, o todos
> el mismo día, no se puede ajustar la curva).

## Endpoints

| Método | Ruta        | Descripción                              |
|--------|-------------|------------------------------------------|
| GET    | `/health`   | Estado del servicio                      |
| POST   | `/predecir` | Recibe pesajes y devuelve la predicción  |

### Ejemplo — `POST /predecir`

Petición:

```json
{
  "pesajes": [
    { "dia": 7,  "peso": 180 },
    { "dia": 14, "peso": 500 },
    { "dia": 21, "peso": 1000 },
    { "dia": 28, "peso": 1650 }
  ],
  "dia_faena": 42,
  "peso_objetivo_g": 2500
}
```

Respuesta:

```json
{
  "peso_proyectado_faena_g": 3256,
  "dia_faena": 42,
  "dias_al_objetivo": 37,
  "peso_objetivo_g": 2500
}
```

`dia_faena` y `peso_objetivo_g` son opcionales (usan esos valores por defecto).

## Cómo se ejecuta

El servicio corre en Docker junto al resto del sistema. Desde la raíz del
proyecto:

```bash
docker compose up -d ml
```

Queda disponible en `http://localhost:8000`. Dentro de la red de Docker, el
backend lo alcanza como `http://ml:8000`.

## Archivos

| Archivo            | Rol                                                     |
|--------------------|---------------------------------------------------------|
| `prediccion.py`    | La lógica del modelo (regresión con numpy)              |
| `main.py`          | La API FastAPI que expone la predicción                 |
| `requirements.txt` | Las dependencias de Python                              |
| `Dockerfile`       | La imagen del servicio                                  |

## Quién lo consume

El backend (NestJS), en su módulo `predicciones`, expone
`GET /v1/predicciones/:loteId`: trae los pesajes del lote de la base de datos,
calcula el día de vida de cada uno y llama a este servicio. El frontend no habla
directamente con este microservicio; siempre pasa por el backend.
