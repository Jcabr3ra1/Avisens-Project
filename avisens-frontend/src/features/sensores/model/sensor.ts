export type DatosSensor = {
  codigo: string
  tipo: string
  unidad_medida: string
  modelo: string
  fabricante: string
}

export const SENSOR_TIPOS = ['temperatura', 'humedad', 'co2', 'nh3', 'luz']

export const FORMULARIO_SENSOR_INICIAL: DatosSensor = {
  codigo: '',
  tipo: 'temperatura',
  unidad_medida: '°C',
  modelo: '',
  fabricante: '',
}
