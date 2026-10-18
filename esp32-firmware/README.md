# Firmware ESP32 — Avisens

Firmware del **nodo ESP32** que se instala en un galpón. Lee el DHT22,
**controla el ventilador localmente** y envía temperatura y humedad al backend
local durante la prueba inicial. Producción es un modo separado, explícito y
usa HTTPS autenticado.

Escrito en **C++ con PlatformIO** (framework Arduino) sobre **VS Code** — sin el
Arduino IDE. Así aprovechamos las librerías de sensores del ecosistema Arduino
(DHT, etc.) pero con un entorno de desarrollo profesional.

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
git**. Si ya tienes ese archivo configurado, consérvalo; no lo reemplaces con la
plantilla.

1. Solo si todavía no existe, copia la plantilla:
   ```bash
   cp include/config.example.h include/config.h
   ```
2. En `include/config.h` configura:
   - **WiFi:** `WIFI_SSID` y `WIFI_PASSWORD`.
   - **Producción:** `BACKEND_URL` con la URL HTTPS pública de `/ingest`
     (Railway). La plantilla ya la trae.
   - **Pines y umbrales:** `PIN_DHT` debe coincidir con el cableado real; las
     conexiones adicionales se eligen en la página y no pueden usar el pin del
     relé.

No hace falta copiar tokens ni IP al código. Todo lo demás se configura desde
la página y queda guardado en la memoria del ESP32.

### Dos destinos a la vez: producción y local

El controlador envía cada lectura a:

| Destino | Cómo se activa | Comportamiento |
| --- | --- | --- |
| Producción (Railway) | «Vincular ESP32» desde la página pública, una sola vez por USB | Principal. HTTPS con la CA ISRG Root X1 y reloj por NTP. Si se cae el internet guarda hasta 3 horas y reenvía con la hora real. |
| Local (tu computador) | «Vincular ESP32» desde la página local (`localhost` o una IP privada), una sola vez por USB | Opcional, «si se puede». Encuentra el computador por mDNS o por las IP vecinas a la última conocida; si no está, omite la lectura sin retrasar a producción. |

La página decide sola qué token envía: abierta en local guarda el token local;
abierta en producción, el de producción. Cada base de datos tiene su propio
controlador registrado, así que cada lado necesita su token.

Para que el ESP32 vea tu computador:

1. Usa la misma red Wi-Fi (las redes de invitados o con aislamiento de clientes
   lo impiden).
2. Abre el backend a la red local con `scripts/esp32-lan.sh`, que detecta la IP,
   publica el puerto 3000 solo en esa IP privada y anuncia Avisens por mDNS.
   En PowerShell: `$env:AVISENS_BACKEND_BIND="192.168.1.42"; docker compose up -d backend`.
3. El ESP32 solo entrega su token a un equipo cuyo `/health` responda
   `"servicio":"avisens"`.

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

Un `401` con «token inválido» ocurre antes de guardar lecturas: el token que
tiene el ESP32 no es del controlador registrado en ese destino. Regenera el
token desde la acción **Token** del controlador y vincúlalo con «Vincular ESP32»
desde la misma página (local o producción). Regenerarlo invalida el
anterior; el ESP32 aplica el nuevo sin recompilar.

---

## Pendiente para verificar el equipo físico

- [ ] Confirmar el modelo exacto de la placa y escoger la fuente regulada de
  acuerdo con sus especificaciones y los periféricos conectados.
- [ ] Probar con WiFi real, sensores y relé conectados; comprobar control local
  con internet disponible y durante una desconexión.
- [ ] Confirmar que `/ingest` responde `201` y que el panel Monitoreo muestra las
  lecturas con la misma hora y códigos configurados.
