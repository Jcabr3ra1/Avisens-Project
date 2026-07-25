# Sensores ESP32 → Firebase → Avisens

Firmware para el ESP32 que lee los sensores ambientales de un galpón y los
envía a Firebase Realtime Database, de donde el frontend de Avisens los toma
en vivo (`avisens-frontend/src/shared/hooks/useLecturasVivas.ts`).

## Cómo encaja con el resto del proyecto

```
ESP32 (este firmware) ──► Firebase Realtime Database ──► Frontend (Monitoreo, Mi Galpón)
                                                                │
                          Todo lo demás (Alertas, Bitácora,     │
                          Finanzas, usuarios…) sigue igual,     │
                          servido por el backend NestJS/Postgres┘
```

Mientras ningún ESP32 haya escrito lecturas para un galpón, el frontend se ve
exactamente igual que hoy (con los datos de ejemplo). Apenas este firmware
empieza a escribir en `galpones/<CODIGO>/lecturas`, esos valores reemplazan al
mock automáticamente para ese galpón — sin tocar nada más del sistema.

## 1. Instalar las librerías (Arduino IDE)

Herramientas → Administrar bibliotecas, instalar:
- **Firebase Arduino Client Library for ESP8266 and ESP32** (autor: mobizt)
- **DHT sensor library** + **Adafruit Unified Sensor** (autor: Adafruit)
- **BH1750** (autor: claws)

Y en Herramientas → Placa, instalar el paquete de boards **esp32** (por Espressif
Systems) si no lo tienes, desde el gestor de tarjetas.

## 2. Cablear los sensores

| Sensor | Mide | Conexión |
|---|---|---|
| DHT22 | Temperatura y humedad | Pin de datos → GPIO 4 |
| MQ-135 | CO2 (aproximado) | Salida analógica → GPIO 34 |
| MQ-137 | Amoniaco / NH3 (aproximado) | Salida analógica → GPIO 35 |
| BH1750 | Luz (lux) | SDA → GPIO 21, SCL → GPIO 22 (I2C) |

## 3. Configurar Firebase

1. En [Firebase Console](https://console.firebase.google.com), entra a tu proyecto.
2. Crea una **Realtime Database** (no Firestore) si no la tienes aún.
3. En las reglas de esa base de datos, para la fase de prototipo/demo:
   ```json
   { "rules": { ".read": true, ".write": true } }
   ```
   Esto la deja abierta — está bien para una demo o para el aula, pero **no la
   dejes así si el proyecto pasa a producción real**: en ese momento hay que
   agregar autenticación (Firebase Auth) y reglas que solo dejen escribir al
   dispositivo correspondiente.
4. Copia `apiKey` y la URL de la base de datos desde Configuración del
   proyecto → Tus apps → SDK setup and configuration.

## 4. Configurar el firmware

Abre `esp32_sensores_avisens.ino` y llena, arriba del todo:

- `WIFI_SSID` / `WIFI_PASSWORD`
- `FIREBASE_API_KEY` / `FIREBASE_DATABASE_URL`
- `CODIGO_GALPON` — debe coincidir exactamente con el código que usa el
  frontend (`GP-01`, `GP-02`, `GP-03`…). Si vas a montar varios ESP32 (uno por
  galpón), este es el único valor que cambia entre ellos.

Sube el código al ESP32 y abre el Monitor Serial (115200 baudios) para ver las
lecturas que va enviando cada 60 segundos.

## 5. Conectarlo al frontend

En `avisens-frontend/.env.local`, llena las mismas credenciales de Firebase
(las variables `VITE_FIREBASE_*`). Reinicia `npm run dev` y entra a
**Monitoreo** — el galpón cuyo código coincida con `CODIGO_GALPON` empezará a
mostrar las lecturas reales en cuanto el ESP32 escriba la primera vez.

## Nota sobre precisión de los sensores MQ (CO2 y NH3)

El MQ-135 y el MQ-137 son sensores de gas económicos de propósito general, no
sensores certificados de laboratorio. El firmware incluye una fórmula de
aproximación (curva típica Rs/R0 de estos sensores), pero para que el número
sea preciso en ppm reales hay que calibrar `R0_MQ135` y `R0_MQ137` con tu
sensor físico específico (dejarlo encendido 24–48h en aire limpio y calcular
R0 según el datasheet del fabricante). Sin calibrar, el valor sigue siendo útil
para ver tendencias (si sube o baja), pero no es un dato de laboratorio.
