# Firmware ESP32 — Avisens

> **Alcance de este documento en la rama `feat/iot-mq135-hx711`**
>
> Esta rama conserva el firmware **modular** (FreeRTOS): DHT22, MQ-135, HC-SR04,
> HX711, relés K1-K4, motores y control remoto. La primera parte de este README
> lo describe y es lo vigente aquí.
>
> `develop` mantiene otro firmware, **monolítico** (un solo `main.cpp`), con la
> asociación dinámica de sensores DHT22 y el modo de producción con TLS. Esas
> funciones **todavía no están portadas** al firmware modular: se conservan
> documentadas en la sección «Referencia» y en
> [ASOCIACION-DINAMICA.md](ASOCIACION-DINAMICA.md), y su lista de pendientes está
> más abajo.

Escrito en **C++ con PlatformIO** (framework Arduino) sobre **VS Code** — sin el
Arduino IDE. Así aprovechamos las librerías de sensores del ecosistema Arduino
(DHT, etc.) pero con un entorno de desarrollo profesional.

---

## Firmware modular (vigente en esta rama)

Lee cinco sensores, controla localmente los actuadores del galpón y envía las
lecturas al backend por `POST /ingest` (HTTP, cabecera `X-Device-Token`, un
`id_lote` por ciclo para reintentar sin duplicar). Desde la web se pueden pedir
órdenes sobre los relés K1-K4, pero **decide el ESP32**: ver
[CONTROL_REMOTO.md](CONTROL_REMOTO.md).

**Regla de oro:** el backend registra; no controla. Ventiladores, bomba,
persiana, alimentador y puerta se deciden aquí, con los umbrales de
`config.h`, para que el galpón siga protegido sin WiFi.

### Sensores y actuadores

| Componente | Pin(es) en `config.example.h` | Qué reporta o hace |
|---|---|---|
| DHT22 | `DHTPIN` 4 | Temperatura y humedad (`TEMP-G1-01`, `HUM-G1-01`) |
| MQ-135 | `MQ135_PIN` 34 | ADC crudo filtrado 0-4095, **no ppm** (`GAS-G1-01`) |
| HC-SR04 | `TRIG_AGUA` 13, `ECHO_AGUA` 35 | Distancia al agua en cm, no nivel (`AGUA-G1-01`) |
| HX711 | `HX711_DT` 15, `HX711_SCK` 16 | Peso en g, solo tras `TARA` (`PESO-G1-01`) |
| KY-032 | `KY032_PIN` 33 | Presencia; abre la puerta, no se reporta al backend |
| Relés K1-K4 | `K1_PIN` 32, `K2_PIN` 25, `K3_PIN` 27, `K4_PIN` 14 | Calefacción, ventilador, extractor y bomba de agua |
| L293D canal A | `EN1_PIN` 5, `IN1_PIN` 18, `IN2_PIN` 19 | Motor de la persiana |
| L293D canal B | `EN2_PIN` 21, `IN3_PIN` 22, `IN4_PIN` 23 | Alimentador (tornillo sinfín) |
| Servo | `SERVO_PIN` 2 | Puerta |

Los relés y los motores se reportan como sensores de unidad `estado`
(`REL-K1-G1-01`… `REL-K4-G1-01`, `MOT-ALIM-G1-01`, `MOT-PERS-G1-01`).

### Configuración

Copia `include/config.example.h` a `include/config.h` (ignorado por git, no lo
compartas) y completa `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_URL` y
`DEVICE_TOKEN`. Los códigos `CODIGO_*` deben coincidir **exactamente** con los
de la tabla `sensores`. Si ya tienes un `config.h`, **compáralo con la plantilla
y añade las macros nuevas a mano**: una copia antigua puede no compilar.

Para registrar los sensores de un dispositivo ya creado en la web:

```bash
pnpm run seed:sensores-esp32            # dispositivo "galpon1"
pnpm run seed:sensores-esp32 galpon2    # otro codigo_topic
```

Hasta calibrar el HX711 con un peso conocido, deja `HX711_CALIBRADO` en `0`: el
peso se envía como «sospechosa» y la web lo muestra «Sin calibrar».

### Comandos por el monitor serie (115200 baud)

| Comando | Efecto |
|---|---|
| `TARA` | Calibra el cero del HX711 con la celda vacía |
| `RELES` | Lista el estado de K1-K4 y si están en manual |
| `<relé> ON`, `OFF` o `AUTO` | Fuerza un relé a mano o lo devuelve al automático; `<relé>` es `K1`…`K4` o `CALEFACTOR`, `VENTILADOR`, `EXTRACTOR`, `BOMBA` |
| `REARME` o `RESET` | Reinicia la máquina de estados desde `INIT` |

Un relé tomado por serial queda en **manual local**: la web no puede cambiarlo.
Los comandos de compilación y carga (`pio run`, `pio run -t upload`, monitor)
están en [COMANDOS.md](COMANDOS.md).

### Pruebas

```bash
pio run                      # compila el firmware (solo el entorno esp32dev)
pio test -e native           # reglas de órdenes remotas en el computador (necesita gcc/clang)
pio test -e esp32dev         # las mismas pruebas en la placa
```

### Trabajo pendiente de portar desde `develop`

Estas funciones existen en el firmware monolítico de `develop` y **no están en
esta rama**. Mientras tanto, la pantalla «Asignar sensores» de Monitoreo y
`GET /ingest/configuracion` existen en el backend y la web, pero **este firmware
no los usa**: asignar un DHT22 allí no tiene efecto en él.

- [ ] **Asociación dinámica de DHT22:** consultar `GET /ingest/configuracion` cada
  30 s y leer varios DHT22 en los GPIO configurados, enviando `{tipo, canal, valor}`.
  Hoy se envían `{codigo, valor}` con los `CODIGO_*` de `config.h`; el backend
  acepta los dos contratos.
- [ ] **Pines reservados:** antes de portarlo, la lista de GPIO ofrecidos debe
  excluir todos los que usa este firmware (relés, L293D, servo, HC-SR04, HX711,
  MQ-135, KY-032 y `DHTPIN`). Ejemplo concreto: `develop` documenta el DHT22 en
  el GPIO 18, que aquí es `IN1_PIN` del motor de la persiana.
- [ ] **Modo producción con TLS:** `BACKEND_MODO`, validación de la URL HTTPS y
  certificado raíz con reloj NTP. `include/isrg_root_x1.h` se conserva para ese
  trabajo, pero **ningún código de esta rama lo incluye** y hoy solo se envía
  por HTTP.
- [ ] **Sin serial en el firmware:** `develop` quita los seriales de sensor de la
  configuración; aquí siguen los `CODIGO_*`.
- [ ] **Un único `config.example.h`:** `develop` retiró `DEVICE_CODIGO_TOPIC`,
  `MQTT_*` y los `CODIGO_SENSOR_*` de la plantilla; en esta rama se conservan
  (`MQTT_*` no se usa: el transporte es HTTP).

---

## Referencia: firmware monolítico de `develop` (pendiente de portar)

> **Todo lo que sigue hasta el final describe el firmware de `develop`, no el de
> esta rama.** Se conserva porque documenta lo que falta portar. En esta rama
> **no** corresponden: los sensores implementados (aquí hay cinco), el pinout,
> las macros `PIN_DHT`, `PIN_RELE`, `BACKEND_MODO` y `TEMP_ENCIENDE_VENTILADOR`,
> la salida serie de ejemplo, «Qué hace hoy», el modo producción con TLS ni la
> consulta de `/ingest/configuracion`.
>
> **Siguen siendo válidos aquí:** programar y operar sin computador, consultar
> la IP LAN, abrir el backend solo para la prueba local y el diagnóstico del
> `401`.

Firmware del **nodo ESP32** que se instala en un galpón. Lee el DHT22,
**controla el ventilador localmente** y envía temperatura y humedad al backend
local durante la prueba inicial. Producción es un modo separado, explícito y
usa HTTPS autenticado.

---

## Cómo encaja en el sistema

```
┌───────────┐   lee    ┌──────────┐ HTTP local / HTTPS prod ┌────────────┐
│ Sensores  │ ───────▶ │  ESP32   │ ──────────────────────▶ │  Backend   │
│ DHT22     │          │ (este    │          /ingest        │  NestJS    │
└───────────┘          │ firmware)│                         └─────┬──────┘
                       └────┬─────┘                               ▼
              controla      │ (local, por umbral)           ┌───────────┐
              ventilador ◀──┘                               │ Postgres  │
              (relé)                                        └───────────┘
```

**Regla de oro de la arquitectura:** el backend **solo registra, NO controla**.
La decisión de encender/apagar el ventilador vive **aquí, en el ESP32**, por
umbrales de temperatura. Así el galpón sigue protegido aunque se caiga el WiFi.

---

## Requisitos

- **VS Code** + extensión **PlatformIO IDE** para compilar y flashear una vez.
- Un **ESP32** compatible con la placa `esp32dev` configurada en PlatformIO y un cable USB de datos para programarlo.
- Para operar sin computador después de programarlo, una fuente regulada adecuada para el modelo exacto de placa. El ventilador debe usar su propia fuente a través del relé; nunca se alimenta desde el ESP32.
- **Sensor implementado:** DHT22 (temperatura + humedad). Los pines de MQ-135 y LDR que aparecen en la plantilla no se leen ni se envían todavía.
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

Tus credenciales Wi-Fi y pines viven en `include/config.h`, que **no se sube a
git**. Si ya tienes ese archivo configurado, consérvalo: para esta prueba solo
edita `BACKEND_URL` y comprueba que `BACKEND_MODO` esté en local. No reemplaces
tu `config.h` con la plantilla.

1. Solo si todavía no existe, copia la plantilla:
   ```bash
   cp include/config.example.h include/config.h
   ```
   Si ya existe, edita solo los campos necesarios en tu copia local; no la
   reemplaces ni la compartas.
2. En `include/config.h` configura:
   - **WiFi:** deja intactos los valores `WIFI_SSID`, `WIFI_PASSWORD` que ya
     funcionan en tu ESP32.
   - **Modo:** deja `BACKEND_MODO` como `BACKEND_MODO_LOCAL` para esta fase.
   - **Backend local:** cambia `BACKEND_URL` por
     `http://<IP_LAN_DEL_COMPUTADOR>:3000/ingest`. Usa la IPv4 privada del equipo
     donde se ejecuta el backend; `localhost` señalaría al propio ESP32.
   - **Token:** pega en `DEVICE_TOKEN` el token que muestra una sola vez el
     registro del dispositivo o la acción de regenerarlo. No lo envíes por chat,
     no lo publiques y no lo subas a Git.
   - **Sensores:** registra y vincula las conexiones DHT22 desde Monitoreo;
     no se copian seriales al firmware. Se consultan cada 30 segundos.
   - **Pines:** `PIN_DHT` conserva el DHT22 usado para control local del relé;
     debe coincidir con el cableado real. Las conexiones adicionales se eligen
     en Monitoreo y no pueden usar el pin del relé.
   - **Umbrales:** a qué temperatura enciende/apaga el ventilador.

   La plantilla trae un ejemplo de IP, que debes sustituir por la IPv4 real.
   En modo local el firmware solo acepta direcciones IPv4 privadas, el puerto
   `3000` y la ruta `/ingest`; usa HTTP únicamente para esta prueba dentro de la
   LAN. No configures aún la URL pública.

### Consultar la IP LAN y abrir el backend solo para la prueba

1. En el computador que ejecuta Docker, consulta su IPv4 de Wi-Fi:
   - macOS: `ipconfig getifaddr en0` (si no devuelve IP, revisa cuál interfaz
     Wi-Fi está activa en Ajustes de Red).
   - Windows: ejecuta `ipconfig` y busca la IPv4 del adaptador Wi-Fi.
   - Linux: `hostname -I`; usa la IPv4 privada de Wi-Fi, no una IP de Docker,
     VPN o pública.
2. Confirma que el computador y el ESP32 usan la misma red Wi-Fi. Las redes de
   invitados o el aislamiento de clientes pueden impedir que se vean.
3. Desde la raíz del repositorio, enlaza el puerto del backend solo a esa IP
   privada y levanta el servicio local:
   - macOS/Linux: `AVISENS_BACKEND_BIND=192.168.1.42 docker compose up -d backend`
   - PowerShell: `$env:AVISENS_BACKEND_BIND="192.168.1.42"; docker compose up -d backend`
   Reemplaza `192.168.1.42` por la IP del paso 1. Sin esa variable, Compose
   enlaza el backend solo a `127.0.0.1`. No uses una IP pública, no configures
   redirección de puertos en el router y permite TCP 3000 únicamente desde la
   red local si el firewall lo requiere.
4. Comprueba `/health` y, tras la provisión inicial y carga del firmware,
   revisa el resultado real: `registradas` debe ser mayor que cero y el serial
   correspondiente debe mostrar la medición en Monitoreo. No envíes lecturas
   inventadas a la base usada para la prueba física. `/ingest/configuracion`
   requiere el mismo token del controlador; no lo compartas ni lo pegues en
   comandos que queden guardados en el historial.

   Sustituye IP, token y códigos por los valores del entorno local. Un `201`
   aquí confirma la ruta local; tras flashear, el monitor serie del ESP32 debe
   mostrar `[Backend] 201`. Este paso no llama al backend público.

### Producción, después de completar la prueba local

Producción requiere cambiar explícitamente `BACKEND_MODO` a
`BACKEND_MODO_PRODUCCION` y poner la URL HTTPS pública de `/ingest`. En ese modo
el firmware usa la CA ISRG Root X1 versionada en `include/isrg_root_x1.h` y
sincroniza el reloj por NTP antes de transmitir. El certificado siempre se
valida; no existe fallback sin TLS.

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

## Programar y operar sin computador

Con el ESP32 conectado por USB, en la barra inferior de VS Code:

| Botón | Acción                                             | Comando equivalente        |
|-------|----------------------------------------------------|----------------------------|
| ✓     | **Build** — compila                                | `pio run`                  |
| →     | **Upload** — flashea el ESP32                       | `pio run -t upload`        |
| 🔌    | **Monitor** — abre el monitor serie (115200 baud)  | `pio device monitor`       |

El cable USB se usa para compilar, flashear y, si se desea, revisar la salida
serie. Después de subir el firmware, el ESP32 puede desconectarse del computador:
aliméntalo con una fuente regulada compatible con la placa y mantenlo en la
misma Wi-Fi que el backend local durante la prueba. No podemos confirmar la
fuente exacta hasta conocer el modelo de placa y los componentes conectados.

En la primera conexión, la salida serie puede mostrar:

```
=== Nodo ESP32 Avisens ===
[WiFi] Iniciando conexión a TU_WIFI
[WiFi] Conectado. IP: 192.168.1.42
[HTTP local] Modo de desarrollo LAN activo (sin TLS).
[Envío] temp=26.4 C  hum=61.0 %  ventilador=off
[Backend] 201: 1 registradas, 1 ignoradas.
```

---

## Qué hace hoy

- ✅ Inicia WiFi y reintenta sin bloquear el control local si la red se cae.
- ✅ Lee el DHT22 cada ~2 s (ignora lecturas inválidas `NaN`).
- ✅ **Control local del ventilador** con histéresis (`TEMP_ENCIENDE_VENTILADOR`
  / `TEMP_APAGA_VENTILADOR`): enciende al subir del umbral, apaga al bajar del
  inferior — así no titila alrededor de un solo valor.
- ✅ Envía temperatura y humedad a `POST /ingest` con `X-Device-Token` al
  backend LAN en modo local.
- ✅ El modo producción requiere selección explícita y envía por HTTPS con
  certificado validado.
- ✅ La reconexión y el transporte corren en una tarea separada del control
  local; NTP se usa en producción para validar el certificado.
- ℹ️ En una caída prolongada, la cola conserva solo la lectura más reciente;
  no mantiene un historial ilimitado en memoria. Las lecturas intermedias se
  descartan.

La CA integrada es ISRG Root X1, usada para validar la cadena actual de
Let's Encrypt. Si el proveedor cambia a otra cadena de confianza, actualiza el
certificado raíz desde una fuente oficial y vuelve a compilar y flashear.

---

## Flujo de alta y diagnóstico

1. El administrador registra el ESP32 desde Organizaciones → organización →
   Galpones, controladores y asignación de sensores, o desde Monitoreo.
   El galpón ya seleccionado determina el destino. El servidor genera el código
   del controlador con consecutivo (`GAL-000027-ESP32-001`, `-002`, etc.) y su
   nombre visible. Firmware e IP son datos opcionales. Guarda el token de
   ingesta, que se muestra una sola vez y autentica al nodo. La asociación del
   galpón se resuelve con ese token; su código no se duplica en el firmware.
2. En Monitoreo, agrega los tipos de medición al mismo galpón y selecciona ese
   dispositivo y su conexión **DHT22 · GPIO**. Para el DHT de D18 usa GPIO 18.
   Temperatura y humedad del mismo módulo comparten GPIO; cada variable conserva
   un serial propio, generado por el servidor. No registres humedad si todavía
   no quieres asociarla. Para sensores anteriores, abre «Sensores registrados»
   y usa «Vincular conexión» sin borrar el sensor ni su historial.
3. El usuario carga una vez este firmware genérico y el token del controlador.
   Después, agregar otro DHT22 en un GPIO habilitado y registrarlo en Monitoreo
   no exige editar ni cargar firmware: el nodo consulta las conexiones cada 30 s.
   Cada ESP32 nuevo recibe su propio token durante su provisión inicial.
4. `GET /ingest/configuracion` devuelve solo conexiones activas de ese nodo.
   El firmware envía `{tipo, canal, valor}`, por ejemplo tipo `temperatura` y
   canal `gpio:18`. El backend resuelve el serial asignado a ese nodo/galpón.
   Una variable no registrada se ignora y no crea sensores automáticamente.

El lector incluido es DHT22; otros modelos requieren implementar su lector.
Varios DHT22 necesitan un GPIO distinto por módulo. El pin del relé se excluye
localmente aunque aparezca entre los GPIO generales de Monitoreo. Si no hay red,
el DHT original sigue controlando el ventilador; las conexiones descargadas se
conservan en RAM hasta reiniciar. Después del reinicio se descargan de nuevo.
El contrato anterior por `{codigo, valor}` permanece disponible para firmware
anterior. Consulta [el contrato y criterios](ASOCIACION-DINAMICA.md).

Si no llegan lecturas, revisa Wi-Fi, red LAN, IP privada del host y token del
controlador local. Un `201` por sí solo no demuestra persistencia: el firmware
muestra cuántas lecturas quedaron registradas y cuántas se ignoraron. Revisa
además la medición del sensor en Monitoreo. En cada instalación nueva, la prueba
queda pendiente hasta cargar el firmware y recibir un envío real con token válido.

Un `401` con «Token de dispositivo inválido» ocurre antes de guardar lecturas.
Usa el token del controlador registrado en el backend local. Si no conservaste
el que se mostró al crear el nodo, un administrador puede regenerarlo desde
su acción **Token** y copiarlo directamente a `DEVICE_TOKEN`, sin pasarlo por
el chat ni guardarlo en archivos versionados. Regenerarlo invalida el anterior;
no cambia por sí solo el firmware que ya está cargado en la placa.

---

## Pendiente para verificar el equipo físico

- [ ] Confirmar el modelo exacto de la placa y escoger la fuente regulada de
  acuerdo con sus especificaciones y los periféricos conectados.
- [ ] Probar con WiFi real, sensores y relé conectados; comprobar control local
  con internet disponible y durante una desconexión.
- [ ] Confirmar que `/ingest` responde `201` y que el panel Monitoreo muestra las
  lecturas con la misma hora y códigos configurados.
