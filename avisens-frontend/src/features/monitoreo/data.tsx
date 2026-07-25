// data.tsx — Tipos y datos mock del módulo de Monitoreo Ambiental (EP-04).
// Cuando exista el backend de IoT, este archivo se reemplaza por llamadas
// a la API. Los umbrales configurados abajo son específicos de cada galpón
// (día de vida y manejo); la referencia genérica del Manual Italcol por
// semana vive en SensorDetail.tsx y es solo orientativa.
import type { ReactNode } from 'react'
import { IcThermo, IcDrop, IcCloud, IcWind, IcSun } from '@shared/ui/icons/icons'

// ─── Tipos ────────────────────────────────────────────────────────────────────

// Estado del sensor según comparación con los umbrales configurados
export type EstadoSensor = 'optimo' | 'advertencia' | 'critico' | 'offline'

// Variables ambientales que mide el sistema
export type VariableSensor = 'temperatura' | 'humedad' | 'co2' | 'nh3' | 'luz'

// Una lectura de sensor en un galpón
export type Sensor = {
  id: string            // Identificador único del sensor
  variable: VariableSensor
  etiqueta: string      // Nombre legible: "Temperatura", "Humedad relativa"…
  zona: string          // Zona dentro del galpón (Norte, Sur, Centro…)
  valor: number         // Último valor leído
  unidad: string        // °C, %, ppm, lux
  minUmbral: number     // Límite inferior del rango óptimo (Manual Italcol)
  maxUmbral: number     // Límite superior del rango óptimo
  estado: EstadoSensor
  ultimaLectura: string // Tiempo relativo: "hace 30s", "hace 2min"
}

// Un galpón con todos sus sensores
export type GalponMonitoreo = {
  id: number
  codigo: string
  nombre: string
  diaVida: number       // Día de vida del lote actual
  sensores: Sensor[]
}

// ─── Datos mock ───────────────────────────────────────────────────────────────
// Valores simulados basados en el Manual Italcol para pollos de engorde Ross 308.
// Umbral de temperatura según semana de vida (ver también SensorDetail.tsx):
//   Semana 1 (1-7d): 30-33°C · Semana 2 (8-14d): 28-30°C ·
//   Semana 3 (15-21d): 26-28°C · Semana 4+ (22d+): 22-26°C.
// Humedad 50-70% toda la vida del lote · NH₃ máx 25 ppm (advertencia desde 10).

export const GALPONES_MONITOREO: GalponMonitoreo[] = [
  {
    id: 1, codigo: 'GP-01', nombre: 'Galpón Norte', diaVida: 32,
    sensores: [
      // Día 32 = semana 5 ("4+"): ideal 22-26°C. 29.4°C está 13% sobre el máximo
      // — no se bajó la calefacción a tiempo con el lote ya grande, advertencia.
      { id: 's1-temp',  variable: 'temperatura', etiqueta: 'Temperatura',    zona: 'Norte',  valor: 29.4, unidad: '°C',  minUmbral: 22, maxUmbral: 26, estado: 'advertencia', ultimaLectura: 'hace 28s' },
      { id: 's1-hum',   variable: 'humedad',     etiqueta: 'Humedad relativa', zona: 'Norte',  valor: 64,   unidad: '%',   minUmbral: 50, maxUmbral: 70, estado: 'optimo',      ultimaLectura: 'hace 28s' },
      { id: 's1-co2',   variable: 'co2',         etiqueta: 'CO₂',             zona: 'Centro', valor: 2100, unidad: 'ppm', minUmbral: 0,  maxUmbral: 3000, estado: 'optimo',    ultimaLectura: 'hace 35s' },
      // NH3 ligeramente elevado → advertencia
      { id: 's1-nh3',   variable: 'nh3',         etiqueta: 'Amoniaco (NH₃)',  zona: 'Sur',    valor: 22,   unidad: 'ppm', minUmbral: 0,  maxUmbral: 25, estado: 'advertencia', ultimaLectura: 'hace 35s' },
      { id: 's1-luz',   variable: 'luz',         etiqueta: 'Iluminación',     zona: 'Centro', valor: 18,   unidad: 'lux', minUmbral: 10, maxUmbral: 40, estado: 'optimo',      ultimaLectura: 'hace 1min' },
    ],
  },
  {
    id: 2, codigo: 'GP-02', nombre: 'Galpón Sur', diaVida: 18,
    sensores: [
      // Día 18 = semana 3: ideal 26-28°C. 30.1°C está 7.5% sobre el máximo → advertencia.
      { id: 's2-temp',  variable: 'temperatura', etiqueta: 'Temperatura',    zona: 'Norte',  valor: 30.1, unidad: '°C',  minUmbral: 26, maxUmbral: 28, estado: 'advertencia', ultimaLectura: 'hace 22s' },
      { id: 's2-hum',   variable: 'humedad',     etiqueta: 'Humedad relativa', zona: 'Norte',  valor: 73,   unidad: '%',   minUmbral: 50, maxUmbral: 70, estado: 'advertencia', ultimaLectura: 'hace 22s' },
      { id: 's2-co2',   variable: 'co2',         etiqueta: 'CO₂',             zona: 'Centro', valor: 1850, unidad: 'ppm', minUmbral: 0,  maxUmbral: 3000, estado: 'optimo',    ultimaLectura: 'hace 30s' },
      { id: 's2-nh3',   variable: 'nh3',         etiqueta: 'Amoniaco (NH₃)',  zona: 'Sur',    valor: 9,    unidad: 'ppm', minUmbral: 0,  maxUmbral: 25, estado: 'optimo',      ultimaLectura: 'hace 30s' },
      { id: 's2-luz',   variable: 'luz',         etiqueta: 'Iluminación',     zona: 'Centro', valor: 24,   unidad: 'lux', minUmbral: 10, maxUmbral: 40, estado: 'optimo',      ultimaLectura: 'hace 55s' },
    ],
  },
  {
    id: 3, codigo: 'GP-03', nombre: 'Galpón Este', diaVida: 41,
    sensores: [
      // Día 41 = semana 6 ("4+"): ideal 22-26°C. 35.2°C está 35% sobre el máximo — crítico.
      { id: 's3-temp',  variable: 'temperatura', etiqueta: 'Temperatura',    zona: 'Sur',    valor: 35.2, unidad: '°C',  minUmbral: 22, maxUmbral: 26, estado: 'critico',     ultimaLectura: 'hace 15s' },
      { id: 's3-hum',   variable: 'humedad',     etiqueta: 'Humedad relativa', zona: 'Norte',  valor: 58,   unidad: '%',   minUmbral: 50, maxUmbral: 70, estado: 'optimo',      ultimaLectura: 'hace 20s' },
      { id: 's3-co2',   variable: 'co2',         etiqueta: 'CO₂',             zona: 'Centro', valor: 2780, unidad: 'ppm', minUmbral: 0,  maxUmbral: 3000, estado: 'advertencia', ultimaLectura: 'hace 18s' },
      // 18 ppm cae en la banda "advertencia" del propio Manual Italcol (10-25 ppm)
      { id: 's3-nh3',   variable: 'nh3',         etiqueta: 'Amoniaco (NH₃)',  zona: 'Sur',    valor: 18,   unidad: 'ppm', minUmbral: 0,  maxUmbral: 25, estado: 'advertencia', ultimaLectura: 'hace 18s' },
      { id: 's3-luz',   variable: 'luz',         etiqueta: 'Iluminación',     zona: 'Centro', valor: 12,   unidad: 'lux', minUmbral: 10, maxUmbral: 40, estado: 'optimo',      ultimaLectura: 'hace 2min' },
    ],
  },
  {
    id: 4, codigo: 'GP-04', nombre: 'Galpón Oeste', diaVida: 0,
    sensores: [
      // Galpón vacío — sensores offline (sin lote activo)
      { id: 's4-temp', variable: 'temperatura', etiqueta: 'Temperatura',    zona: 'N/A', valor: 0, unidad: '°C',  minUmbral: 30, maxUmbral: 33, estado: 'offline', ultimaLectura: 'sin señal' },
      { id: 's4-hum',  variable: 'humedad',     etiqueta: 'Humedad relativa', zona: 'N/A', valor: 0, unidad: '%',   minUmbral: 50, maxUmbral: 70, estado: 'offline', ultimaLectura: 'sin señal' },
      { id: 's4-co2',  variable: 'co2',         etiqueta: 'CO₂',             zona: 'N/A', valor: 0, unidad: 'ppm', minUmbral: 0,  maxUmbral: 3000, estado: 'offline', ultimaLectura: 'sin señal' },
      { id: 's4-nh3',  variable: 'nh3',         etiqueta: 'Amoniaco (NH₃)',  zona: 'N/A', valor: 0, unidad: 'ppm', minUmbral: 0,  maxUmbral: 25, estado: 'offline', ultimaLectura: 'sin señal' },
      { id: 's4-luz',  variable: 'luz',         etiqueta: 'Iluminación',     zona: 'N/A', valor: 0, unidad: 'lux', minUmbral: 10, maxUmbral: 40, estado: 'offline', ultimaLectura: 'sin señal' },
    ],
  },
]

// Íconos por variable ambiental — mismo set de línea que usa el resto de la app
// (antes eran emojis, que desentonaban con el look del Dashboard/Admin/Personas).
export const ICONOS_VARIABLE: Record<VariableSensor, ReactNode> = {
  temperatura: <IcThermo size={16} />,
  humedad:     <IcDrop   size={16} />,
  co2:         <IcCloud  size={16} />,
  nh3:         <IcWind   size={16} />,
  luz:         <IcSun    size={16} />,
}
