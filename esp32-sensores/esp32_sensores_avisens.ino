/*
  esp32_sensores_avisens.ino
  ---------------------------------------------------------------------------
  Referencia de lo que YA escribe tu ESP32 en Firebase, más el sensor de CO2
  que falta agregar. No reemplaces tu sketch actual con este archivo tal
  cual — es una referencia para que copies solo la parte del MQ-135 dentro
  de tu código real (el que ya envía temperatura/humedad/calidadAire).

  Ruta en Firebase Realtime Database (la que ya usas hoy):
    sensores/
      temperatura   ← ya lo tienes (DHT22 u otro)
      humedad       ← ya lo tienes
      calidadAire   ← ya lo tienes (se deja intacto, no se toca)
      co2           ← NUEVO: lo que agrega este archivo (MQ-135 dedicado)
      obstaculo     ← ya lo tienes (Avisens no lo usa, no afecta nada)
      peso          ← ya lo tienes (Avisens no lo usa, no afecta nada)
      timestamp     ← ya lo tienes

  El frontend de Avisens ya está listo para leer el campo nuevo `co2` en
  cuanto empiece a llegar, y mientras tanto sigue usando `calidadAire` como
  respaldo (ver useLecturasVivas.ts) — no hay que coordinar el cambio, solo
  agregar el sensor y subir el código.

  Sensores que faltan para completar Monitoreo (NH3, luz): no se incluyen
  aquí porque hoy no tienes ese hardware. Cuando consigas un MQ-137 (NH3) o
  un BH1750/LDR (luz), el mismo patrón de este archivo sirve para agregarlos:
  leer el pin, escribir un campo nuevo (`nh3`, `luz`) en la misma ruta
  `sensores`, y el frontend los toma automáticamente — ya está preparado
  para eso, no hay que tocar nada del lado de la app.
  ---------------------------------------------------------------------------
*/

// ─── Lo nuevo a agregar: MQ-135 para CO2 dedicado ──────────────────────────

// Pin analógico donde conectas la salida del MQ-135 (usa uno libre; en la
// mayoría de boards ESP32 DevKit, GPIO 34 o 35 son buenas opciones porque
// son "input only" y no chocan con otros periféricos).
#define PIN_MQ135 34

// Calibración: en aire limpio (afuera, sin humo ni gases), se deja el sensor
// encendido 24-48h y se mide su resistencia (Rs) para calcular R0 según el
// datasheet del MQ-135. Mientras no calibres esto con tu sensor físico, el
// valor sirve para ver tendencias (sube/baja), no como dato de laboratorio.
#define R0_MQ135 76.63

// Lee el MQ-135 y devuelve una aproximación en ppm (fórmula genérica Rs/R0
// de estos sensores — no es una medición certificada, ver nota de arriba).
float leerCO2() {
  int lectura = analogRead(PIN_MQ135);              // 0-4095 en ESP32 (ADC 12 bits)
  float voltaje = lectura * (3.3 / 4095.0);
  float rs = ((3.3 - voltaje) / voltaje) * 1000.0;  // resistencia de carga aprox. 1k
  float relacion = rs / R0_MQ135;
  float ppm = 116.6020682 * pow(relacion, -2.769034857); // curva genérica MQ
  if (isnan(ppm) || ppm < 0) return 0;
  return ppm;
}

/*
  Dónde usarlo dentro de tu sketch real:

  En tu función que ya arma y envía el JSON de `sensores` (donde hoy pones
  temperatura, humedad, calidadAire, obstaculo, peso, timestamp), agrega
  UNA línea más:

    float co2 = leerCO2();
    json.set("co2", co2);   // o el equivalente en la librería que ya usas
                             // para escribir temperatura/humedad/calidadAire

  Eso es todo — no hay que tocar la lectura de calidadAire, obstaculo, peso
  ni el resto de tu código, solo sumar este campo nuevo al mismo paquete que
  ya envías cada ciclo.
*/
