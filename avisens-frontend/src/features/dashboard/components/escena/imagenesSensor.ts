import type { ClaseSensor } from '../../model/escenaGalpon'
import sensorTemperatura from '../../assets/escena/sensores/temperatura-low-poly.webp'
import sensorHumedad from '../../assets/escena/sensores/humedad-low-poly.webp'
import sensorCo2 from '../../assets/escena/sensores/co2-low-poly.webp'
import sensorAmoniaco from '../../assets/escena/sensores/amoniaco-low-poly.webp'
import sensorLuz from '../../assets/escena/sensores/luz-low-poly.webp'

export const IMAGENES_SENSOR: Record<ClaseSensor, string> = {
  temperatura: sensorTemperatura,
  humedad: sensorHumedad,
  co2: sensorCo2,
  amoniaco: sensorAmoniaco,
  luz: sensorLuz,
}
