# Firmware ESP32-CAM — Cámara del galpón

Firmware de la **ESP32-CAM (AI-Thinker, OV2640)** que vigila los pollos del
galpón. Cada `INTERVALO_FOTO_MS` toma una foto JPEG y la envía al backend por
`POST /ingest/foto` (cabecera `X-Device-Token`). El backend la pasa al servicio
ML, que detecta los pollos con un modelo **YOLO11n** entrenado con fotos de
galpón, y luego:

- sigue a cada pollo entre fotos y marca los que no se mueven:
  **quieto** (más de `VISION_QUIETO_MIN`, 5 min) y **posible muerto**
  (más de `VISION_MUERTO_MIN`, 60 min);
- guarda la foto y el análisis en la base de datos;
- abre una alerta `vision_pollo_inmovil` (criticidad alta) si hay posibles
  muertos;
- lo muestra en **Monitoreo → Cámara del galpón**: la última foto con cajas de
  colores (verde normal, amarillo quieto, rojo posible muerto) y el conteo de
  las últimas fotos.

> "Posible muerto" es solo tiempo sin moverse: una señal para revisar el
> galpón, no un diagnóstico.

La cámara **no analiza nada**: solo toma y envía fotos. Toda la inferencia
ocurre en el servidor.

## 1. Registrar la cámara en Avisens

En **Dispositivos → Registrar controlador ESP32**, elige el galpón donde va la
cámara. Avisens muestra el token **una sola vez**: cópialo para `config.h`.
La foto queda asociada a ese galpón.

## 2. Configurar

```bash
cp include/config.example.h include/config.h
```

Completa en `include/config.h` (está en `.gitignore`, no se sube a git):

| Constante | Qué es |
|---|---|
| `WIFI_SSID`, `WIFI_PASSWORD` | Red de **2.4 GHz** |
| `BACKEND_URL_FOTO` | `https://avisens-project-production.up.railway.app/ingest/foto` o, en local, `http://<IP-LAN-del-PC>:3000/ingest/foto` (nunca `localhost`) |
| `DEVICE_TOKEN` | El token del paso 1 |
| `INTERVALO_FOTO_MS` | 10 s por defecto; 30-60 s gasta menos red y base de datos |
| `CAMARA_FRAMESIZE` | `FRAMESIZE_VGA` (640×480) detecta bastante mejor que QVGA |
| `CAMARA_VFLIP`, `CAMARA_HMIRROR` | Según cómo quede montada |

## 3. Programar

La ESP32-CAM no trae USB. Se programa con un adaptador USB-TTL o con un
**Arduino UNO como puente** (RESET del UNO a GND):

| ESP32-CAM | Puente |
|---|---|
| 5V | 5V |
| GND | GND |
| U0R (GPIO3) | RX (en el UNO, pin 0) |
| U0T (GPIO1) | TX (en el UNO, pin 1) |
| GPIO0 | GND **solo para programar** |

```bash
pio run -t upload
```

Al terminar, quita el puente GPIO0-GND y presiona RESET. Monitor serie:

```bash
pio device monitor
```

Aliméntala con una fuente de 5 V y al menos 1 A: con menos, la cámara se
reinicia al encender el WiFi.

## 4. Apuntar la cámara

En la misma red, abre la IP que imprime el monitor serie:

- `http://<IP>/` — estado: WiFi, último envío y respuesta del servidor;
- `http://<IP>/capture` — una foto nueva, para encuadrar el galpón.

Una cámara alta que vea el piso completo da mejores detecciones. El flash
queda apagado para no molestar a los pollos.

## Robustez

- Si una foto no se envía, se reintenta en el siguiente ciclo (no se guardan).
- Tras `FALLOS_PARA_REINICIAR` (30) envíos fallidos seguidos, se reinicia sola.
  Un 401/403 (token) no cuenta: reiniciar no lo arregla.

## En producción

Requiere el servicio ML (`avisens-ml`) desplegado y, en el backend,
`ML_URL` y `ML_INTERNAL_TOKEN`. Los umbrales y la retención de fotos se
ajustan con las variables `VISION_*` (ver `avisens-backend/.env.example`).
