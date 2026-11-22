import type { FiltrosAlertas, ResumenAlertas as Resumen } from '../model/alerta'

export type TarjetaResumenAlerta = 'todas' | 'abierta' | 'en_proceso' | 'criticas'

interface ResumenAlertasProps {
  resumen: Resumen
  cargando: boolean
  alcance?: string
  filtros?: FiltrosAlertas
  onSeleccionar?: (tarjeta: TarjetaResumenAlerta) => void
}

function tarjetaActivaDe(filtros?: FiltrosAlertas): TarjetaResumenAlerta | null {
  if (!filtros) return null
  if (filtros.criticidad === 'alta' && (filtros.estado === 'activas' || filtros.estado === 'todas')) {
    return 'criticas'
  }
  if (filtros.criticidad === 'todas' && filtros.estado === 'abierta') return 'abierta'
  if (filtros.criticidad === 'todas' && filtros.estado === 'en_proceso') return 'en_proceso'
  if (filtros.criticidad === 'todas' && filtros.estado === 'todas') return 'todas'
  return null
}

function ResumenAlertas({
  resumen,
  cargando,
  alcance = 'En todos los galpones',
  filtros,
  onSeleccionar,
}: ResumenAlertasProps) {
  const valor = (numero: number) => (cargando ? '—' : numero)
  const activa = tarjetaActivaDe(filtros)

  const tarjetas: {
    id: TarjetaResumenAlerta
    etiqueta: string
    cifra: string | number
    detalle: string
    tono?: 'aviso' | 'peligro'
  }[] = [
    {
      id: 'todas',
      etiqueta: 'Registradas',
      cifra: valor(resumen.total),
      detalle: alcance,
    },
    {
      id: 'abierta',
      etiqueta: 'Por atender',
      cifra: valor(resumen.abiertas),
      detalle: resumen.abiertas > 0 ? 'Esperan atención' : 'Nada pendiente',
      tono: resumen.abiertas > 0 ? 'aviso' : undefined,
    },
    {
      id: 'en_proceso',
      etiqueta: 'En atención',
      cifra: valor(resumen.enProceso),
      detalle: 'Ya tienen responsable',
    },
    {
      id: 'criticas',
      etiqueta: 'Críticas activas',
      cifra: valor(resumen.criticas),
      detalle: resumen.criticas > 0 ? 'Requieren acción inmediata' : 'Ninguna en este momento',
      tono: resumen.criticas > 0 ? 'peligro' : undefined,
    },
  ]

  return (
    <div className="ale-indicadores" role="group" aria-label="Resumen de alertas">
      {tarjetas.map((item) => {
        const seleccionada = activa === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`ale-indicador${seleccionada ? ' is-activo' : ''}`}
            aria-pressed={seleccionada}
            onClick={() => onSeleccionar?.(item.id)}
          >
            <span className="ale-indicador-etiqueta">{item.etiqueta}</span>
            <strong className={item.tono ? `ale-indicador--${item.tono}` : undefined}>
              {item.cifra}
            </strong>
            <small>{item.detalle}</small>
          </button>
        )
      })}
    </div>
  )
}

export default ResumenAlertas
