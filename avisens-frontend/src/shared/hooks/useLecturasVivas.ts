import { useEffect, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { rtdb } from '../api/firebase'

// Variables ambientales que puede mostrar Monitoreo.
export type VariableLectura = 'temperatura' | 'humedad' | 'co2' | 'nh3' | 'luz'

// Una lectura ya normalizada: valor + el momento en que el frontend la recibió.
export type LecturaViva = {
  valor: number
  ts: number
}

export type LecturasPorVariable = Partial<Record<VariableLectura, LecturaViva>>

// Único galpón que hoy tiene un ESP32 físico conectado. El resto de los
// galpones sigue mostrando siempre sus datos de ejemplo (mock), porque no hay
// hardware real todavía para ellos. Cuando se agregue un segundo dispositivo,
// esto pasa a ser una tabla { codigoGalpon → ruta en Firebase }.
const CODIGO_GALPON_CON_SENSOR_REAL = 'GP-01'

// Forma real de lo que el ESP32 ya está escribiendo en Firebase, en la ruta
// raíz `sensores` (un solo dispositivo, sin separar por galpón todavía):
//   { temperatura, humedad, calidadAire, co2, obstaculo, peso, timestamp }
// `obstaculo` y `peso` no los usa Monitoreo (no son variables ambientales de
// este módulo) y se ignoran aquí.
// `co2` es el sensor MQ-135 dedicado que se agregó para Avisens — si ya está
// presente se usa ese; `calidadAire` (el sensor genérico que ya traía el
// dispositivo de otra prueba) queda como respaldo mientras tanto, para no
// perder la lectura de CO2 en el momento en que aún no se ha conectado el
// MQ-135 dedicado.
// `timestamp` que envía el propio ESP32 es `millis()` (tiempo desde que
// encendió el equipo, no la hora real) — no sirve directamente como hora,
// pero sí sirve para detectar si el dispositivo escribió algo nuevo: si ese
// número no cambia entre una lectura y la siguiente, es que el ESP32 no ha
// vuelto a enviar nada (está apagado, sin WiFi, colgado, etc.), y Firebase
// solo está repitiendo el último valor que alguna vez recibió.
type LecturaCrudaEsp32 = {
  temperatura?: number
  humedad?: number
  calidadAire?: number
  co2?: number
  obstaculo?: boolean
  peso?: number
  timestamp?: number
}

// Guarda el último `timestamp` de dispositivo visto y en qué momento real
// (reloj del navegador) se vio por primera vez — en localStorage, para que
// sobreviva incluso a recargar la página completa (F5) o cerrar y volver a
// abrir el navegador. Así, el "hace X" siempre cuenta desde la última
// escritura real del ESP32, nunca se reinicia a "hace 0s" solo porque
// alguien recargó o volvió a entrar.
const CLAVE_ANCLA = 'avisens_ultima_lectura_esp32'

function leerAncla(): { deviceTs: number; horaLocal: number } | null {
  try {
    const guardado = localStorage.getItem(CLAVE_ANCLA)
    return guardado ? JSON.parse(guardado) : null
  } catch {
    return null
  }
}

function guardarAncla(deviceTs: number, horaLocal: number) {
  try {
    localStorage.setItem(CLAVE_ANCLA, JSON.stringify({ deviceTs, horaLocal }))
  } catch {
    // localStorage no disponible (modo privado, etc.) — se sigue funcionando
    // en memoria nada más, solo se pierde la persistencia entre recargas.
  }
}

// Escucha en tiempo real la lectura del único ESP32 conectado hoy (ruta
// `sensores` en Firebase Realtime Database) y la entrega en el mismo formato
// que espera Monitoreo. Para cualquier galpón que no sea
// CODIGO_GALPON_CON_SENSOR_REAL, devuelve `{}` de inmediato — ese galpón sigue
// mostrando su dato de ejemplo (mock) sin ningún cambio.
export function useLecturasVivas(codigoGalpon: string): LecturasPorVariable {
  const [lecturas, setLecturas] = useState<LecturasPorVariable>({})

  useEffect(() => {
    if (codigoGalpon !== CODIGO_GALPON_CON_SENSOR_REAL) {
      setLecturas({})
      return
    }

    const sensoresRef = ref(rtdb, 'sensores')
    const detener = onValue(sensoresRef, (snapshot) => {
      const cruda = (snapshot.val() ?? {}) as LecturaCrudaEsp32

      // Solo si el dispositivo realmente escribió un timestamp distinto al
      // último que vimos (incluso en visitas anteriores, gracias a
      // localStorage), asumimos que la lectura es de "ahora mismo".
      const ancla = leerAncla()
      let ts = ancla?.horaLocal ?? Date.now()

      if (typeof cruda.timestamp === 'number' && cruda.timestamp !== ancla?.deviceTs) {
        ts = Date.now()
        guardarAncla(cruda.timestamp, ts)
      }

      const normalizada: LecturasPorVariable = {}
      if (typeof cruda.temperatura === 'number') normalizada.temperatura = { valor: cruda.temperatura, ts }
      if (typeof cruda.humedad === 'number')     normalizada.humedad     = { valor: cruda.humedad, ts }

      // CO2: se prefiere el MQ-135 dedicado (`co2`) sobre el genérico
      // (`calidadAire`) en cuanto el primero empiece a llegar.
      if (typeof cruda.co2 === 'number') {
        normalizada.co2 = { valor: cruda.co2, ts }
      } else if (typeof cruda.calidadAire === 'number') {
        normalizada.co2 = { valor: cruda.calidadAire, ts }
      }

      setLecturas(normalizada)
    })
    return () => detener()
  }, [codigoGalpon])

  return lecturas
}
