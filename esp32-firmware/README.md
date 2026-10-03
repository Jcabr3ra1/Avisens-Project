# Firmware ESP32 — Avisens

Firmware del **nodo ESP32** que se instala en cada galpón. Lee los sensores
ambientales, **controla el ventilador localmente** y (paso pendiente) reporta
las lecturas al backend de Avisens.

Escrito en **C++ con PlatformIO** (framework Arduino) sobre **VS Code** — sin el
Arduino IDE. Así aprovechamos las librerías de sensores del ecosistema Arduino
(DHT, etc.) pero con un entorno de desarrollo profesional.

---

## Cómo encaja en el sistema

```
┌───────────┐   lee    ┌──────────┐   (transporte     ┌────────────┐         ┌──────────┐
│ Sensores  │ ───────▶ │  ESP32   │    PENDIENTE) ───▶ │  Backend   │ ──────▶ │ Postgres │
│ DHT22…    │          │ (este    │    MQTT o HTTP     │  NestJS    │         │mediciones│
└───────────┘          │ firmware)│                    └────────────┘         └────┬─────┘
                       └────┬─────┘                                                │
              controla      │ (local, por umbral)                                  ▼
              ventilador ◀──┘                                              ┌────────────┐
              (relé)                                                       │  Frontend  │
                                                                          └────────────┘
```

**Regla de oro de la arquitectura:** el backend **solo registra, NO controla**.
La decisión de encender/apagar el ventilador vive **aquí, en el ESP32**, por
umbrales de temperatura. Así el galpón sigue protegido aunque se caiga el WiFi.

---

## Requisitos

- **VS Code** + extensión **PlatformIO IDE**.
- Un **ESP32** (DevKit) y un cable USB de datos.
- **Sensores:** DHT22 (temperatura + humedad). Opcionales: MQ-135 (gas/CO2), LDR (luz).
- **Actuador:** módulo de relé + ventilador con su propia fuente.

---

## Estructura del proyecto

```
esp32-firmware/
├── platformio.ini            Config del proyecto (placa, framework, librerías)
├── include/
│   ├── Configuracion.h       Pines, umbrales, tiempos y tipos compartidos (SÍ se versiona)
│   ├── config.example.h      Plantilla de credenciales del nodo (SÍ se versiona)
│   └── config.h              TUS credenciales (gitignored, NO se versiona)
└── src/
    ├── main.cpp              Arranque: periféricos + tareas FreeRTOS
    ├── TareaControl.cpp      Core 0: sensores, actuadores, fail-safe
    ├── TareaRed.cpp          Core 1: WiFi + telemetría MQTT
    ├── TareaIngesta.cpp      Core 1: envío HTTP al backend (POST /ingest)
    └── ServicioIngesta.cpp   Arma el lote, reintenta y valida la respuesta
```

---

## Configuración (antes de compilar)

`config.h` solo contiene lo propio de cada nodo y **no se sube a git**. Todo lo
demás (pines, umbrales, tiempos) está en `Configuracion.h`, que es común.

1. Copia la plantilla:
   ```bash
   cp include/config.example.h include/config.h
   ```
   Sin `config.h` la compilación falla con un mensaje que lo indica.
2. Rellena en `include/config.h`:
   - **WiFi:** `WIFI_SSID`, `WIFI_PASS`.
   - **Backend:** `BACKEND_URL` = URL **base** (`http://IP_DE_TU_PC:3000`, sin
     `/ingest`) y `DEVICE_TOKEN`.
   - **Códigos de sensores:** `CODIGO_SENSOR_*`, idénticos al campo `codigo`
     de la tabla `sensores`. Deja `""` en los que no estén dados de alta.
   - **MQTT (opcional):** `MQTT_BROKER_HOST` vacío lo desactiva.

> ⚠️ Si tenías un `config.h` de la plantilla anterior, vuelve a copiarlo:
> ahora no debe definir pines, umbrales ni `enum`/`struct` (se duplicarían).

### Alta en el backend

Para que las lecturas se guarden, en el backend debe existir:

1. Un **dispositivo** activo en un galpón activo. Su token se genera/revela con
   `POST /dispositivos/:id/token` → va en `DEVICE_TOKEN`.
2. Un **sensor** activo por cada `CODIGO_SENSOR_*` usado, asociado a **ese
   mismo dispositivo**:

   | Constante                 | Sensor físico | `valor` enviado                   |
   |---------------------------|---------------|-----------------------------------|
   | `CODIGO_SENSOR_TEMP`      | DHT22         | Temperatura °C                    |
   | `CODIGO_SENSOR_HUM`       | DHT22         | Humedad %                         |
   | `CODIGO_SENSOR_NH3`       | MQ-135        | ADC crudo filtrado (0–4095)       |
   | `CODIGO_SENSOR_PESO`      | HX711         | Gramos en la tolva                |
   | `CODIGO_SENSOR_AGUA`      | HC-SR04       | Distancia al agua en cm           |
   | `CODIGO_SENSOR_PRESENCIA` | KY-032        | 1 = presencia, 0 = libre          |

Si un código no existe, el backend responde 201 pero lo **ignora**; el monitor
serie lo muestra como `Códigos ignorados: ...`.

---

## Cableado (pinout de referencia)

Definido en `Configuracion.h`:

| Componente              | Pin ESP32                  | Notas                                  |
|-------------------------|----------------------------|----------------------------------------|
| DHT22 (datos)           | GPIO 4                     | VCC a 3.3 V                            |
| MQ-135 (AO)             | GPIO 34                    | **Analógico**: solo pines ADC (32–39)  |
| HC-SR04 TRIG / ECHO     | GPIO 13 / GPIO 35          |                                        |
| KY-032                  | GPIO 33                    |                                        |
| HX711 DT / SCK          | GPIO 15 / GPIO 16          |                                        |
| Relés K1–K4             | GPIO 32 / 25 / 27 / 14     | Calefacción, ventilador, extractor, bomba |
| L293D persiana EN/IN    | GPIO 5 / 18 / 19           |                                        |
| L293D sinfín EN/IN      | GPIO 21 / 22 / 23          |                                        |
| Servo puerta            | GPIO 2                     |                                        |

**Notas importantes de conexión:**
- **GND común:** el ESP32, los relés y las fuentes de las cargas deben
  compartir tierra (GND). Si no comparten GND, el relé no conmuta.
- **Fuentes aparte:** las cargas NO se alimentan de los pines del ESP32.
- Los pines **32–39** son los únicos con ADC utilizable para sensores analógicos.

---

## Compilar, subir y ver la salida

Con el ESP32 conectado por USB, en la barra inferior de VS Code:

| Botón | Acción                                             | Comando equivalente        |
|-------|----------------------------------------------------|----------------------------|
| ✓     | **Build** — compila                                | `pio run`                  |
| →     | **Upload** — flashea el ESP32                       | `pio run -t upload`        |
| 🔌    | **Monitor** — abre el monitor serie (115200 baud)  | `pio device monitor`       |

Si el envío funciona, cada ~5 s verás:

```
[Ingesta] OK 6 lecturas, intento 1/3, id_lote=3f6c...
```

---

## Envío al backend

- **HTTP `POST /ingest`** (tarea propia, cada `INTERVALO_ENVIO_MS`): manda las
  lecturas válidas con cabecera `X-Device-Token`. Un sensor en error no se
  envía (no se registra un valor arrastrado como medición nueva).
- **Idempotencia:** cada ciclo lleva un `id_lote` UUID; los reintentos usan el
  mismo, así el backend no duplica mediciones.
- **Validación de la respuesta:** un 2xx solo cuenta si trae `id_lote`,
  `registradas` e `ignoradas` coherentes. 401 y 4xx no se reintentan.
- **Fecha:** tras sincronizar por NTP se envía `fecha_dispositivo` (UTC, hora
  de captura). Sin NTP el backend usa su hora de recepción.
- **MQTT** (opcional): telemetría en vivo y comandos de actuadores en
  `avisens/<MQTT_DEVICE_ID>/...`. El backend todavía no consume MQTT; lo que se
  guarda en la base llega por `/ingest`.
