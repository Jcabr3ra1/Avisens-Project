#include "TareaIngesta.h"

#include <Arduino.h>
#include <freertos/task.h>

#include "Configuracion.h"
#include "Nodo.h"

// Tarea aparte para la ingesta HTTP: un POST con reintentos puede tardar
// varios segundos y, dentro de tareaRed, dejaría sin atender mqtt_.loop()
// hasta tumbar la sesión MQTT por keepalive.
void tareaIngesta(void *pvParameters)
{
  for (;;)
  {
    servicioIngesta.actualizar();
    vTaskDelay(pdMS_TO_TICKS(PERIODO_TAREA_INGESTA_MS));
  }
}
