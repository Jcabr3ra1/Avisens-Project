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

- ✅ Conecta al WiFi (y reconecta si se cae).
- ✅ Lee el DHT22 cada ~2 s (ignora lecturas inválidas `NaN`).
- ✅ **Control local del ventilador** con histéresis (`TEMP_ENCIENDE_VENTILADOR`
  / `TEMP_APAGA_VENTILADOR`): enciende al subir del umbral, apaga al bajar del
  inferior — así no titila alrededor de un solo valor.
- 🟡 **Reporta al backend:** por ahora solo **imprime** lo que enviaría. El
  envío real está pendiente de la decisión de transporte (abajo).

---

## Enviar los datos al backend (PENDIENTE)

Falta una decisión de arquitectura y algo de trabajo en el backend:

1. **Elegir transporte** (ver `enviarLectura()` en `main.cpp`):
   - **MQTT** — el ESP32 publica a un broker (Mosquitto) y un consumidor en el
     backend lo guarda. Más robusto; encaja con `codigo_topic`. Librería:
     `PubSubClient`.
   - **HTTP** — el ESP32 hace `POST /ingest` con un token de dispositivo.
     Más simple de arrancar. Librería: `HTTPClient` (ya viene con el ESP32).
2. **Construir la puerta en el backend:** hoy la única entrada de mediciones es
   `POST /mediciones`, protegida con **JWT + rol** (login humano). Un ESP32 no
   puede loguearse así, por lo que falta crear la vía de ingesta para
   dispositivos (broker+consumidor MQTT, o un endpoint `/ingest` con token).
3. **Identificar por código, no por id:** el firmware manda
   `DEVICE_CODIGO_TOPIC` + el código del sensor (p. ej. `TEMP-G1-01`); el
   backend resuelve código → `sensor_id`. Nunca quemar ids numéricos de BD aquí.

---

## Próximos pasos

- [ ] Confirmar que el "latido" sube y se ve en el monitor serie.
- [ ] Ajustar `config.h` (WiFi, pines, umbrales reales).
- [ ] Decidir transporte: **MQTT** vs **HTTP `/ingest`**.
- [ ] Implementar `enviarLectura()` según lo decidido.
- [ ] Construir en el backend la vía de ingesta para dispositivos.
- [ ] (Frontend) cambiar las lecturas en vivo de Firebase → backend.
