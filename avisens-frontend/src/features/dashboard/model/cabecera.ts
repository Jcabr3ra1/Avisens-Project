import type { FilaGalpon } from './resumenGranja'
import type { EstadoSensores } from './semaforo'

export type CifraCabecera = {
  id: 'galpones' | 'aves' | 'alertas' | 'sensores'
  etiqueta: string
  valor: string
  alerta: boolean
}

const enteros = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

export function cifrasCabecera(filas: FilaGalpon[], sensores: EstadoSensores): CifraCabecera[] {
  const activos = filas.filter((fila) => fila.activo)
  const conLote = activos.filter((fila) => fila.lote !== null).length
  const aves = filas.reduce((total, fila) => total + (fila.lote?.aves ?? 0), 0)
  const alertas = filas.reduce((total, fila) => total + fila.alertas, 0)
  const listo = sensores.estado === 'listo'

  return [
    { id: 'galpones', etiqueta: 'Galpones con lote', valor: `${conLote}/${activos.length}`, alerta: false },
    { id: 'aves', etiqueta: 'Aves ingresadas', valor: enteros.format(aves), alerta: false },
    { id: 'alertas', etiqueta: 'Alertas abiertas', valor: enteros.format(alertas), alerta: alertas > 0 },
    {
      id: 'sensores',
      etiqueta: 'Sensores en línea',
      valor: listo ? `${sensores.vigentes}/${sensores.total}` : '—',
      alerta: listo && sensores.total > 0 && sensores.vigentes < sensores.total,
    },
  ]
}
