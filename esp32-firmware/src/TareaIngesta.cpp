#include "TareaIngesta.h"

#include <Arduino.h>
#include <freertos/task.h>

#include "Configuracion.h"
#include "Nodo.h"

void tareaIngesta(void *pvParameters)
{
  for (;;)
  {
    servicioIngesta.actualizar();
    vTaskDelay(pdMS_TO_TICKS(PERIODO_TAREA_INGESTA_MS));
  }
}
