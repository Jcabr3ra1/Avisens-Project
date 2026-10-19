# Control remoto de relés K1-K4

La web puede pedir encender, apagar o devolver a automático los relés K1-K4,
pero **decide el ESP32**. La orden viaja en la respuesta de `POST /ingest` y
el ESP32 la confirma en el `/ingest` siguiente. El código vive en
`include/ControlRemoto.h`, `include/ReglasControlRemoto.h` y
`src/ControlRemoto.cpp`; el backend, en `avisens-backend/src/modules/ordenes-actuadores`.

Motores (persiana, alimentador) y puerta no tienen control remoto.

## Salida ordenada, no estado físico

Lo que el ESP32 informa de cada relé (`estados_reles.encendido`,
`estado_real` de una orden) es la **salida que ordenó al pin**. No hay sensor
de realimentación: nada confirma que el relé conmutó ni que la carga
funciona. La API lo declara con `confirmacion_fisica: "no_disponible"` y la
web muestra "Salida ordenada: encendida/apagada", nunca "relé confirmado".

Un informe con más de 30 s no se presenta como actual ("Sin dato reciente").

## Reinicio del ESP32 (sesión de arranque)

Cada encendido genera un UUID v4 (`arranque_id`) que no se guarda en flash.
Se crea con el WiFi ya conectado: `esp_random()` solo da entropía de
hardware con la radio activa. Viaja en cada `/ingest`.

El ESP32 arranca siempre con los cuatro relés en automático: lo que una orden
manual hubiera hecho antes del reinicio ya no rige.

| Orden al detectar un `arranque_id` nuevo | Qué pasa | Por qué |
|---|---|---|
| `pendiente` | Se entrega a la sesión nueva | Nunca salió: no hay ambigüedad. El ESP32 la vuelve a pasar por sus protecciones. |
| `enviada` a la sesión anterior | Pasa a `incierta`; no se reentrega | Pudo aplicarse y perderse la confirmación. Darla por aplicada sería inventarlo; reentregarla, repetirla. |
| `aplicada` (encender/apagar) | Pasa a `revertida` | El relé arrancó en automático. |
| Cualquier estado final | Sin cambios | |

Reglas de confirmación:

- Una confirmación (`resultados_ordenes` o `estados_reles.orden_id`) solo
  vale si viene de la **misma sesión** que recibió la orden.
- Entregar una orden nunca la marca como aplicada: solo pasa a `enviada`.
- **Confirmación tardía:** si llega después un envío retrasado de la sesión
  anterior (el backend recuerda `arranque_anterior`), puede cerrar sus
  órdenes `incierta` con lo que de verdad pasó, pero no pisa el estado actual
  de los relés ni recibe órdenes nuevas.
- **Orden duplicada:** dentro de una sesión, el ESP32 descarta los ids que
  ya recibió (últimos 16). Entre sesiones, el backend no reentrega.
- **Firmware sin `arranque_id`:** no se detectan reinicios; solo se aceptan
  confirmaciones de órdenes entregadas sin sesión. El primer envío con
  `arranque_id` tras flashear cuenta como reinicio.

**Límite conocido:** solo se reconoce como "anterior" la sesión
inmediatamente previa. Un envío retrasado de hace dos reinicios se trataría
como un reinicio nuevo, lo que deja inciertas las órdenes en vuelo: es
conservador (no confirma nada falso), pero no se ha probado en hardware.

## Protecciones por relé (B4)

Una orden nueva se evalúa con `UsoRegla::AUTORIZAR`: **exige muestras de este
ciclo**. Un relé ya en manual remoto se vigila cada ciclo con
`UsoRegla::SOSTENER`, con los mismos datos que usa la lógica automática: un
fallo puntual no lo revierte (la automática también conserva su última
decisión), un fallo persistente sí. Sin contacto con el backend durante
`MANUAL_REMOTO_SIN_CONTACTO_MS` (60 s), todo vuelve a automático.

### Qué entrega cada driver

| Sensor | Lectura inválida | ¿Sostiene la última? | Antigüedad | Fallo persistente |
|---|---|---|---|---|
| DHT22 (`SensorDHT`) | NaN o fuera de rango → `valida = false` | No | `timestamp` de cada intento | `enError()` tras `MAX_FALLOS_SENSOR` (3) seguidos; se reinicia con una válida |
| HC-SR04 (`SensorUltrasonico`) | Timeout o fuera de rango | **Sí**: hasta 2 fallos devuelve la última medida buena con su `timestamp` original | Sostenida si `timestamp` es anterior al inicio del ciclo | `enError()` al 3.er fallo |
| MQ-135 (`SensorMQ135`) | **Nunca**: `valida` siempre es `true` | No aplica | `timestamp` de cada lectura | No detectable |
| HX711 (`SensorPeso`) | Sin tara, timeout o sobrecarga → `valida = false` | No | `timestamp` de cada intento | `enError()` (3); no lo usa ningún relé |
| KY-032 (`SensorKY032`) | No detectable (entrada digital con pull-up) | No | `timestamp` de cada lectura | No detectable; solo lo usa la puerta |

### Qué usa cada protección

| Relé y acción | Condición | Fuente | Lectura inválida | Lectura sostenida | Fallo persistente |
|---|---|---|---|---|---|
| K1 encender | Bloqueado con calor (≥ `TEMP_CALOR`) o gases (≥ `NH3_ALTO`) | DHT22, MQ-135 | AUTORIZAR: rechaza. SOSTENER: no revierte | El DHT no sostiene | Rechaza o revierte (fail-safe de clima) |
| K1 apagar | Siempre permitido (lado seguro) | — | Permitido | — | Rechaza o revierte |
| K2/K3 apagar | Bloqueado con calor o gases | DHT22, MQ-135 | AUTORIZAR: rechaza. SOSTENER: no revierte | El DHT no sostiene | Rechaza o revierte |
| K2/K3 encender | Siempre permitido (lado seguro) | — | Permitido | — | Rechaza o revierte |
| K4 encender | Bloqueado con tanque lleno (≤ `NIVEL_BOMBA_OFF`) | HC-SR04 | AUTORIZAR: rechaza | AUTORIZAR: rechaza. SOSTENER: usa la sostenida (como la automática) | Rechaza o revierte (fail-safe de agua) |
| K4 apagar | Bloqueado con agua baja (> `NIVEL_BOMBA_ON`) | HC-SR04 | AUTORIZAR: rechaza | AUTORIZAR: rechaza. SOSTENER: usa la sostenida | Rechaza o revierte |
| Todos | Solo en `MONITORING` | FSM global | — | — | Rechaza o revierte |

No se cambió la lógica automática (`GestorActuadores`), ni el PID, ni los
fail-safe.

### Limitaciones y decisiones pendientes de B4

- **MQ-135:** el driver no detecta un sensor desconectado ni en
  precalentamiento, así que "gases altos" puede no detectarse. Hace falta
  definir, con la ficha del módulo y pruebas en banco, un criterio de validez
  (tiempo de precalentamiento, valores de saturación del ADC) antes de
  usarlo para rechazar órdenes. No se inventó un umbral.
- **Humedad:** la lógica automática ventila con humedad alta, pero las
  órdenes remotas no la usan como restricción (es confort, no seguridad).
  Cambiarlo es una decisión de diseño.

## Decisiones pendientes (no implementadas a propósito)

- **M5, tiempos mínimos entre cambios:** no se fijó `MIN_ENTRE_CAMBIOS_MS`.
  Faltan las fichas técnicas del módulo de relés (ciclos de conmutación), de
  la bomba K4 (arranques por hora, tiempo mínimo de apagado), de los
  ventiladores y extractores K2/K3 (motores) y de los bombillos K1. Pruebas
  necesarias: conmutación repetida en banco con carga real, midiendo
  temperatura del módulo y corriente de arranque.
- **B5, K1 encendido con K2 apagado en manual:** se conserva permitido. Falta
  validar el circuito: si la calefacción sin ventilación genera puntos
  calientes o riesgo para los bombillos. Prueba necesaria: K1 encendido con
  K2 apagado durante un tiempo controlado, midiendo la temperatura cerca de
  los bombillos y en el nivel de las aves.

## Pruebas

- `test/test_reglas_control_remoto`: reglas de AUTORIZAR y SOSTENER.
  - En el computador: `pio test -e native` (necesita gcc/clang).
  - En la placa: `pio test -e esp32dev`.
- Backend: `ordenes-actuadores.service.spec.ts` (incluye sesión de arranque)
  y `test/ordenes-actuadores-concurrencia.e2e-spec.ts` (necesita Postgres).
