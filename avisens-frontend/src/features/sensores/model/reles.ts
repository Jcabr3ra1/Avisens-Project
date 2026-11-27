// reles.ts — Identidad de los relés K1-K4 del ESP32 en la web.
//
// Igual que en el backend (sensores/reles.ts): un relé se identifica por su
// ESP32 y su canal ("rele:k1".."rele:k4"). Los registros antiguos sin canal
// se siguen reconociendo por su código "REL-K<n>-..." hasta que se registren
// por canal con «Registrar relés».
import type { RegistroReles, Sensor } from '../api/sensores'

export const CANALES_RELE = ['rele:k1', 'rele:k2', 'rele:k3', 'rele:k4'] as const
export type CanalRele = (typeof CANALES_RELE)[number]

const PATRON_CANAL_RELE = /^rele:k([1-4])$/
const PATRON_CODIGO_RELE_LEGADO = /^REL-K([1-4])-/i

export const NOMBRE_RELE: Record<CanalRele, string> = {
  'rele:k1': 'Bombillos de calefacción',
  'rele:k2': 'Ventiladores',
  'rele:k3': 'Extractores',
  'rele:k4': 'Bomba de agua',
}

export function esCanalRele(canal: string | null | undefined): canal is CanalRele {
  return typeof canal === 'string' && PATRON_CANAL_RELE.test(canal)
}

// "K1".."K4" para mostrar; por canal o, en un registro antiguo, por código.
export function etiquetaRele(sensor: { canal?: string | null; codigo: string }): string | null {
  const porCanal = sensor.canal ? PATRON_CANAL_RELE.exec(sensor.canal) : null
  if (porCanal) return `K${porCanal[1]}`
  if (sensor.canal) return null
  const porCodigo = PATRON_CODIGO_RELE_LEGADO.exec(sensor.codigo)
  return porCodigo ? `K${porCodigo[1]}` : null
}

// Solo K1-K4 aceptan modo manual en el firmware. Con canal manda el canal;
// sin canal, el código antiguo. Los motores también reportan "estado", pero
// no se controlan desde la web.
export function esReleControlable(sensor: {
  esEstado: boolean
  codigo: string
  canal?: string | null
}): boolean {
  if (!sensor.esEstado) return false
  if (sensor.canal) return esCanalRele(sensor.canal)
  return PATRON_CODIGO_RELE_LEGADO.test(sensor.codigo)
}

// Un relé antiguo que todavía no tiene canal: el firmware nuevo no le puede
// entregar órdenes hasta que se registre por canal.
export function esReleSinCanal(sensor: { esEstado: boolean; codigo: string; canal?: string | null }): boolean {
  return esReleControlable(sensor) && !sensor.canal
}

export function esUnidadEstado(unidad: string): boolean {
  return unidad.trim().toLowerCase() === 'estado'
}

// Lo mismo, sobre un sensor tal como lo devuelve la API.
export function esSensorRele(sensor: Pick<Sensor, 'unidad_medida' | 'codigo' | 'canal'>): boolean {
  return esReleControlable({
    esEstado: esUnidadEstado(sensor.unidad_medida),
    codigo: sensor.codigo,
    canal: sensor.canal,
  })
}

// ─── Mensaje del registro de relés ─────────────────────────────────────────

export type MensajeRegistro = {
  tono: 'ok' | 'aviso'
  titulo: string
  // Una línea por canal que necesita atención (conflictos).
  detalles: string[]
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`
}

export function mensajeRegistroReles(registro: RegistroReles): MensajeRegistro {
  const { creados, asociados, existentes, conflictos } = registro.resumen
  const esp32 = registro.dispositivo.codigo_topic || registro.dispositivo.nombre
  const detalles = registro.canales
    .filter((c) => c.resultado === 'conflicto')
    .map((c) => `${etiquetaRele({ canal: c.canal, codigo: '' }) ?? c.canal} · ${c.nombre}: ${c.motivo ?? 'no se pudo asociar'}`)

  if (conflictos === 0 && creados === 0 && asociados === 0) {
    return {
      tono: 'ok',
      titulo: `El registro ya estaba completo: los cuatro relés de ${esp32} existían.`,
      detalles,
    }
  }

  const partes = [
    creados > 0 ? plural(creados, 'creado', 'creados') : null,
    asociados > 0 ? `${plural(asociados, 'registro antiguo asociado', 'registros antiguos asociados')} (conservan su historial)` : null,
    existentes > 0 ? plural(existentes, 'ya existía', 'ya existían') : null,
  ].filter(Boolean)

  if (conflictos > 0) {
    return {
      tono: 'aviso',
      titulo: `${plural(conflictos, 'canal quedó', 'canales quedaron')} sin registrar en ${esp32} por un conflicto` +
        (partes.length > 0 ? `; del resto: ${partes.join(', ')}.` : '.'),
      detalles,
    }
  }
  return { tono: 'ok', titulo: `Relés de ${esp32} registrados: ${partes.join(', ')}.`, detalles }
}
