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
3. **Trazabilidad del modelo** — nombre, versión, framework, puntos usados y
   confianza R² del ajuste. El backend registra estos metadatos en `modelos_ml`
   y los enlaza con cada predicción persistida.

> Requiere al menos **3 pesajes** en **días distintos** (con menos puntos, o todos
> el mismo día, no se puede ajustar la curva).

## Endpoints

| Método | Ruta                   | Descripción                   |
| ------ | ---------------------- | ----------------------------- |
| GET    | `/health`              | Estado del servicio           |
| POST   | `/predecir`            | Proyecta crecimiento          |
| POST   | `/predecir-mortalidad` | Proyecta mortalidad acumulada |
| POST   | `/predecir-consumo`    | Proyecta consumo acumulado    |
| POST   | `/vision/detectar`     | Detecta pollos en una foto    |

Los endpoints de predicción requieren `X-ML-Token` cuando
`ML_INTERNAL_TOKEN` está configurada. `/health` permanece disponible para el
healthcheck interno.

### Visión — `POST /vision/detectar`

Recibe el JPEG crudo de la ESP32-CAM (cuerpo `image/jpeg`, máximo 2 MB) y
devuelve las cajas de los pollos detectados por un modelo YOLO11n entrenado
con fotos de galpón (`modelos/vision/pollos-v1.onnx`). Corre con ONNX Runtime
en CPU, sin PyTorch: unos 130 ms por foto. `?confianza=0.40` ajusta el umbral.

```json
{ "modelo": "yolo11n-pollos-v1", "ancho": 640, "alto": 480, "conteo": 2,
  "detecciones": [{ "x1": 10, "y1": 20, "x2": 60, "y2": 70, "confianza": 0.91, "clase": "broiler" }],
  "duracion_ms": 134 }
```

422 si el cuerpo está vacío o no es una imagen; 413 si pasa de 2 MB. El
seguimiento entre fotos (pollos quietos o posibles muertos) lo hace el backend.

### Ejemplo — `POST /predecir`

Petición:

```json
{
  "pesajes": [
    { "dia": 7, "peso": 180 },
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
  "peso_objetivo_g": 2500,
  "modelo": {
    "nombre": "crecimiento_aves",
    "version": "1.2.0",
    "framework": "numpy",
    "confianza": 0.98,
    "puntos_usados": 4
  }
}
```

`dia_faena` y `peso_objetivo_g` son opcionales (usan esos valores por defecto).

## Confianza, rangos y seguridad

Cada predicción de peso, mortalidad y consumo trae, dentro de `modelo`,
`nivel_confianza` (`alta`, `media`, `baja`) y `motivos`, la lista de razones en
español por las que la proyección es menos firme (pocas mediciones, tendencia
irregular, fecha lejana). Las tres predicciones traen además `rango` (`min`,
`max`). Solo el rango del peso declara `cobertura_pct: 90`, porque es el único
calibrado con `evaluacion/backtest.py`.

Backtest: `python -m evaluacion.backtest ciclos.json DIA_CORTE DIA_OBJETIVO`
simula, para cada lote cerrado, "qué habría predicho el modelo en el día
DIA_CORTE" y lo compara con el peso real: devuelve el error medio y qué
porcentaje de veces el peso real cayó dentro del rango. Con ciclos simulados
(Gompertz con ruido) la cobertura medida queda entre 83 % y 96 %; falta
repetirla con lotes reales de Avisens cuando haya suficientes cerrados.

Calor en la proyección de peso: `/predecir` acepta `horas_calor_severo` (horas
en nivel peligro o emergencia en los últimos 7 días, 0 a 168). Desde 6 horas
agrega `factores`, un motivo y baja el límite inferior del rango hasta un 8 %
(0,1 % por hora), sin tocar la proyección central. Desde 24 horas la confianza
baja un nivel. Es una ampliación prudente de la incertidumbre, no una
estimación biológica del efecto.

Alertas tempranas: `POST /anomalias` recibe `pesajes`, `consumos`,
`mortalidades` y, opcional, `curva_referencia`, y devuelve alertas ordenadas
por gravedad con un mensaje en español: peso que baja o gana muy poco, peso
15 % o más bajo la curva, caída del consumo diario, pico de mortalidad y datos
acumulados que decrecen. Los umbrales son constantes con nombre en
`modelos/anomalias.py`; son reglas de diseño que se ajustan con lotes reales.

Seguridad del servicio:

- Sin `ML_INTERNAL_TOKEN` las predicciones responden 503. Para desarrollo local
  sin token existe `ML_PERMITIR_SIN_TOKEN=true`.
- Cuerpos de más de 256 KB responden 413 y más de 300 peticiones por minuto
  desde un mismo origen responden 429.
- Cada respuesta incluye `X-ML-Huella`: un resumen corto (SHA-256) del cuerpo de
  la petición, para rastrear qué entrada produjo una predicción sin guardar los
  datos de la granja.

## Cómo se ejecuta

El servicio corre en Docker junto al resto del sistema. Desde la raíz del
proyecto:

```bash
docker compose up -d ml
```

No publica un puerto al host en producción. Dentro de la red privada de Docker,
el backend lo alcanza como `http://ml:8000`.

## Archivos

```
avisens-ml/
├── main.py                  La API FastAPI: rutas y token interno
├── esquemas.py              Validación de las peticiones (Pydantic)
├── seguridad.py             Límite de frecuencia, tamaño, token y huella
├── evaluacion/backtest.py   Error y cobertura real de los rangos
├── modelos/
│   ├── anomalias.py         Alertas tempranas de peso, consumo y mortalidad
│   ├── confianza.py         Nivel de confianza, motivos y rangos de predicción
│   ├── polinomial.py        Regresión polinomial (peso, mortalidad, consumo)
│   ├── gompertz.py          Curva de Gompertz anclada a la curva genética
│   ├── vision.py            Detección de pollos (YOLO11n en ONNX Runtime)
│   └── vision/pollos-v1.onnx Pesos del modelo de visión
├── tests/
│   ├── test_api.py          Contrato HTTP de los endpoints
│   ├── test_gompertz.py     Matemática del modelo de Gompertz
│   └── test_vision.py       Detección y endpoint de visión
├── pyproject.toml           Configuración de pytest
├── requirements.txt         Dependencias de Python
├── requirements-dev.txt     Pytest, HTTPX y Ruff para calidad
└── Dockerfile               Imagen del servicio
```

Cada modelo matemático vive en su propio archivo dentro de `modelos/`, y cada
uno tiene su archivo de pruebas en `tests/`.

## Quién lo consume

El backend (NestJS), en su módulo `predicciones`, expone
`GET /v1/predicciones/:loteId`: trae los pesajes del lote de la base de datos,
calcula el día de vida de cada uno y llama a este servicio. El frontend no habla
directamente con este microservicio; siempre pasa por el backend.

## Pruebas

```bash
pip install -r requirements-dev.txt
ruff check .
ruff format --check .
pytest -q
```
