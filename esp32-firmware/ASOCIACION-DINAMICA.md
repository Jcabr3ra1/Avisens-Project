# Asociación dinámica de sensores — desarrollo local

## Alcance autorizado

Un token por ESP32 identifica su controlador y galpón. El serial administrativo
del sensor nunca se configura en el firmware nuevo. No se crean sensores al
recibir lecturas ni al consultar configuración.

## Contrato y criterios

- Monitoreo registra o vincula un sensor con `tipo`, `modelo: DHT22` y
  `canal: gpio:<pin de datos>`. El serial sigue siendo autogenerado.
- PostgreSQL reserva `(dispositivo_id, tipo, canal)` sin duplicados, incluso si
  el sensor está inactivo. Los registros anteriores conservan canal nulo y su
  historial. No se deduce su cableado durante la migración.
- `GET /ingest/configuracion`, con el mismo `X-Device-Token`, entrega únicamente
  conexiones DHT22 activas del controlador autenticado y su propio galpón.
- El firmware consulta cada 30 segundos, aplica cambios en la tarea de lectura
  y conserva su última configuración en RAM si falla la red. Tras reiniciar,
  mantiene el DHT de control local y vuelve a descargar las demás conexiones.
- `POST /ingest` acepta `{tipo, canal, valor}` y resuelve el sensor activo dentro
  del controlador y galpón autenticados. Una conexión desconocida se ignora;
  nunca se asigna por parecido, posición, primer sensor o tipo solamente.
- Se mantiene `{codigo, valor}` para instalaciones anteriores. No se permite
  mezclar las dos identidades en una lectura ni duplicar un sensor en un lote.
- El firmware informa las cantidades registradas/ignoradas, no presenta un 201
  con cero mediciones como éxito de persistencia.

## Hardware y límites

El lector disponible es DHT22. Temperatura y humedad comparten GPIO pero son
variables distintas. Dos DHT22 del mismo tipo necesitan líneas de datos GPIO
distintas; el DHT22 no ofrece una dirección propia para compartir la misma línea.
Los GPIO ofrecidos son los habilitados por este firmware para ESP32 DevKit;
el firmware rechaza además el pin del relé. El DHT de `PIN_DHT` conserva el
control local del ventilador, independientemente de Monitoreo o de la red.
Agregar otros modelos o buses requiere implementar su lector una vez; no basta
con crear una fila de catálogo. No se cambia Wi-Fi ni token automáticamente.

## Orden y verificación

1. Migración aditiva, validación y resolución del backend.
2. Asociación visible y editable desde Monitoreo.
3. Firmware genérico para conexiones DHT22 y documentación.
4. Compilación, comprobaciones aisladas de contrato y lecturas de BD local.

No se usa una ingesta inventada como evidencia física. El 401 actual exige que
el usuario provisione el token emitido por la UI admin directamente en su
configuración privada y cargue una vez el nuevo firmware. No se abre el puerto
serie ni se carga firmware durante este trabajo. No se consulta producción.

## Reversión

El contrato por código continúa operativo. Para volver al firmware anterior,
usar ese contrato con su configuración privada. Conservar la columna nullable
no altera sensores anteriores; no eliminar asociaciones ni mediciones al revertir.

## Evidencia local y pendientes

Archivos principales modificados para este contrato:

- Datos: `avisens-backend/prisma/schema.prisma`, migración
  `20261016030000_asociacion_fisica_sensores`, `MER.md`.
- Backend: DTO, controlador, servicio y pruebas de `modules/ingest`; DTO y
  servicio de `modules/sensores`, nuevo `conexion-sensor.ts` y sus pruebas.
- UI: `AsignarSensores.tsx`, `ConexionDhtSensor.tsx`, `conexionDht.ts`,
  `MonitoreoPage.css` y contrato `features/sensores/api/sensores.ts`.
- Firmware: `src/main.cpp`, `include/config.example.h`, `platformio.ini`,
  `README.md`, `COMANDOS.md`. En `config.h` privado se retiraron únicamente las
  macros de serial; credenciales y cableado existentes se conservaron.

- Migración aplicada en el contenedor existente de desarrollo, sin reiniciar
  contenedores ni publicar puertos.
- Sensor 35, `TEMPERATURA-G27-BB3FE4A48590`, del controlador 9 y galpón 27:
  vinculado a `gpio:18`, el D18 confirmado por el usuario. Conserva su serial.
  No se registró humedad ni otro controlador.
- Las pruebas aisladas comprueban el formato anterior, resolución por conexión,
  aislamiento por controlador/galpón, conexión desconocida, duplicados y GPIO
  incompatible. No son lecturas físicas ni insertan datos en la BD local.
- Compilación de backend, frontend y ESP32 comprobada. Endpoint de configuración
  sin token responde 401; `/health` responde 200.
- Durante la verificación comenzaron a llegar envíos con el contrato nuevo.
  A las `2026-10-16T02:14:59Z` (15 de octubre, 21:14:59 en Colombia), el
  controlador figura online y las cinco ingestas recientes contienen dos
  variables recibidas, una registrada y `humedad:gpio:18` ignorada. El sensor
  35 conserva temperaturas de 26.7–26.8 °C, calidad `ok`. La consulta anterior
  ya contaba 22 ingestas y 18 mediciones; son cantidades que siguen creciendo.
  Esta es evidencia de recepción y persistencia del contrato dinámico, no una
  calibración del sensor ni una prueba de agregar otro DHT22 físicamente.
- El agente no abrió el puerto serie, no cargó firmware y no envió lecturas
  artificiales. La provisión/carga ocurre fuera de esas acciones. No se usa ni
  se recupera el token mostrado en pantalla para probar desde el computador.
- Pendiente de hardware futuro: agregar otro DHT22 por UI y verificar descarga
  del GPIO sin recargar firmware. No hay un segundo sensor conectado para
  realizar esa prueba ahora.
- La asociación local se aplicó con comprobaciones de identidad en una
  transacción de BD: el control nativo del navegador devolvió
  `noWindowsAvailable`. La UI muestra el selector de GPIO, pero su guardado no
  quedó verificado mediante interacción de navegador en esta sesión.

La integración de JSON se basa en la
[documentación oficial de ArduinoJson para HTTPClient](https://arduinojson.org/v7/how-to/use-arduinojson-with-httpclient/).
