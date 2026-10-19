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
├── platformio.ini          Config del proyecto (placa, framework, librerías)
├── .gitignore              Ignora .pio/ y config.h (credenciales)
├── include/
│   ├── config.example.h    Plantilla de configuración (SÍ se versiona)
│   └── config.h            TU config real (gitignored, NO se versiona)
└── src/
    └── main.cpp            El firmware
```

---

## Configuración (antes de compilar)

Tus credenciales y pines viven en `include/config.h`, que **no se sube a git**.

1. Si no existe, copia la plantilla:
   ```bash
   cp include/config.example.h include/config.h
   ```
   (En este repo ya viene un `config.h` con valores de ejemplo para que compile.)
2. Abre `include/config.h` y ajusta:
   - **WiFi:** `WIFI_SSID`, `WIFI_PASSWORD`.
   - **Identidad:** `DEVICE_CODIGO_TOPIC` — debe coincidir con la fila de este
     ESP32 en la tabla `dispositivos` del backend (p. ej. `"galpon1"`).
   - **Pines:** según tu cableado real.
   - **Umbrales:** a qué temperatura enciende/apaga el ventilador.

> ⚠️ Nunca subas contraseñas reales a git. `config.h` ya está en `.gitignore`.

---

## Cableado (pinout de referencia)

Ajusta los pines en `config.h` si usas otros. Estos son los del ejemplo:

| Componente        | Pin ESP32 | Notas                                            |
|-------------------|-----------|--------------------------------------------------|
| DHT22 (datos)     | GPIO 4    | Digital. VCC a 3.3 V, GND a GND.                 |
| Relé (IN)         | GPIO 26   | Salida digital. Ver nota de fuente ↓             |
| MQ-135 (AO)       | GPIO 34   | **Analógico**: solo pines ADC (32–39).           |
| LDR luz           | GPIO 35   | **Analógico**: solo pines ADC (32–39).           |

**Notas importantes de conexión:**
- **GND común:** el ESP32, el módulo de relé y la fuente del ventilador deben
  compartir tierra (GND). Si no comparten GND, el relé no conmuta.
- **Fuente del relé/ventilador aparte:** el ventilador NO se alimenta de los
  pines del ESP32 (chuparía demasiada corriente). Va al lado **conmutado** del
  relé, con su propia fuente. Del ESP32 solo sale la señal de control (pin IN).
- Los pines **32–39** son los únicos con ADC utilizable para sensores analógicos.

---

## Compilar, subir y ver la salida

Con el ESP32 conectado por USB, en la barra inferior de VS Code:

| Botón | Acción                                             | Comando equivalente        |
|-------|----------------------------------------------------|----------------------------|
| ✓     | **Build** — compila                                | `pio run`                  |
| →     | **Upload** — flashea el ESP32                       | `pio run -t upload`        |
| 🔌    | **Monitor** — abre el monitor serie (115200 baud)  | `pio device monitor`       |

Si todo va bien, en el monitor verás algo como:

```
=== Nodo ESP32 Avisens ===
[WiFi] Conectando a TU_WIFI....
[WiFi] Conectado. IP: 192.168.1.42
[Envío] galpon1 → temp=26.4 C  hum=61.0 %  ventilador=off
```

---

## Qué hace hoy

- ✅ Conecta al WiFi y reconecta si se cae.
- ✅ Lee DHT22 (temperatura/humedad), HC-SR04 (nivel de agua), MQ-135 y KY-032.
- ✅ **Control local** de los relés, sin depender del backend: K1 bombillos y
  K2 ventiladores con frío, K3 extractores con calor o humedad alta, K4 bomba
  con nivel de agua bajo (umbrales en `config.h`). Fail-safe si fallan los
  sensores críticos.
- ✅ **Envía al backend** cada `INTERVALO_ENVIO_MS` por `POST /ingest` (HTTP o
  HTTPS) con el header `X-Device-Token`.
- ✅ **Portal web** para configurarlo y actualizarlo por WiFi, sin USB (abajo).

---

## Envío al backend

Cada ciclo manda hasta 9 lecturas, identificadas por código (nunca por id de
BD): temperatura, humedad, nivel de agua, los dos motores del L293D y los
relés K1-K4. Motores y relés van como unidad `estado` (1 = encendido desde el
último envío, 0 = apagado). Un sensor que falla en el ciclo se omite y el
resto se envía igual.

Los códigos (`CODIGO_SENSOR_*`, `CODIGO_MOTOR_*`, `CODIGO_RELE_*` en
`config.h`) tienen que existir como sensores del mismo dispositivo en el
backend, o el backend descarta esas lecturas. Para registrarlos de una vez en
una base local:

```bash
docker compose exec backend pnpm run seed:sensores-esp32 <codigo_topic>
```

En producción se registran desde la app (Sensores), con el mismo código,
tipo y unidad.

---

## Portal web y actualización por WiFi (OTA)

El ESP32 sirve un portal en `http://<IP del ESP32>/`:

| Página | Qué hace | Clave |
|---|---|---|
| `/` | Estado: WiFi, backend, último envío, MAC, versión | No |
| `/config` | Cambiar red WiFi, URL del backend y token (se guardan en el ESP32) | `admin` + `PORTAL_PASSWORD` |
| `/actualizar` | Subir un `firmware.bin` nuevo sin USB | `admin` + `PORTAL_PASSWORD` |

- Lo de `config.h` (WiFi, `BACKEND_URL`, `DEVICE_TOKEN`) es la configuración
  de fábrica; lo guardado en el portal tiene prioridad.
- Si pasa `PORTAL_AP_TRAS_MS` sin WiFi, el ESP32 crea su red propia
  **Avisens-XXXX** (clave `PORTAL_AP_PASSWORD`) con el portal en
  `http://192.168.4.1`, para configurar una red nueva.
- El `firmware.bin` para `/actualizar` lo deja PlatformIO en
  `.pio/build/esp32dev/` al compilar (✓ Build).
- Rescate por USB: el comando `BORRAR_CONFIG` en el monitor serie vuelve a
  la configuración de `config.h`.
- **Una sola vez por USB:** `platformio.ini` usa la tabla de particiones
  `min_spiffs.csv`; un ESP32 grabado con la tabla anterior necesita una
  grabación por cable antes de poder actualizarse por WiFi.

> Si tu `config.h` es anterior a este cambio, copia de `config.example.h` los
> `#define PORTAL_*` (y los `CODIGO_*` nuevos) o no compila.

---

## Sin USB: alimentación desde fuente

El firmware arranca solo al recibir corriente; el USB solo hace falta para
grabar y ver el monitor. Con una fuente ATX: +5 V (rojo) a **VIN** y GND
(negro) a **GND**. La fuente solo enciende con PS_ON (verde) unido a un GND;
el morado (5VSB) da 5 V siempre.
