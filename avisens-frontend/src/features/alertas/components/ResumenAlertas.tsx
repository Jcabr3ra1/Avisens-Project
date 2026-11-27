import { IcAlert, IcBell, IcCheck, IcClock } from '@shared/ui/icons/icons'
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

  const tarjetas = [
    {
      id: 'todas' as TarjetaResumenAlerta,
      etiqueta: 'Registradas',
      cifra: valor(resumen.total),
      detalle: alcance,
      icono: IcBell,
      tono: 'primario',
    },
    {
      id: 'abierta' as TarjetaResumenAlerta,
      etiqueta: 'Por atender',
      cifra: valor(resumen.abiertas),
      detalle: resumen.abiertas > 0 ? 'Esperan atención' : 'Nada pendiente',
      icono: IcClock,
      tono: resumen.abiertas > 0 ? 'aviso' : 'ok',
    },
    {
      id: 'en_proceso' as TarjetaResumenAlerta,
      etiqueta: 'En atención',
      cifra: valor(resumen.enProceso),
      detalle: 'Con seguimiento activo',
      icono: IcCheck,
      tono: 'info',
    },
    {
      id: 'criticas' as TarjetaResumenAlerta,
      etiqueta: 'Críticas activas',
      cifra: valor(resumen.criticas),
      detalle: resumen.criticas > 0 ? 'Acción inmediata' : 'Sin críticas ahora',
      icono: IcAlert,
      tono: resumen.criticas > 0 ? 'peligro' : 'ok',
    },
  ] as const

  return (
    <div className="ale-indicadores" role="group" aria-label="Resumen de alertas">
      {tarjetas.map((item) => {
        const Icono = item.icono
        const seleccionada = activa === item.id
        return (
          <button
            key={item.id}
            type="button"
            className={`ale-indicador ale-indicador--${item.tono}${seleccionada ? ' is-activo' : ''}`}
            aria-pressed={seleccionada}
            onClick={() => onSeleccionar?.(item.id)}
          >
            <span className="ale-indicador-cab">
              <span className="ale-indicador-etiqueta">{item.etiqueta}</span>
              <span className="ale-indicador-icono" aria-hidden="true">
                <Icono size={15} />
              </span>
            </span>
            <strong>{item.cifra}</strong>
            <small>{item.detalle}</small>
          </button>
        )
      })}
    </div>
  )
}

export default ResumenAlertas
