import type { EscalamientoHistorialItem } from '../api/alertas'
import { etiquetaCriticidad, etiquetaEstado, type Alerta } from '../model/alerta'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'

interface HistorialEscalamientosProps {
  items: EscalamientoHistorialItem[]
  config: { limite_critica_min: number; limite_general_min: number } | null
  cargando: boolean
  error: string
  alertasPorId: Map<number, Alerta>
  onReintentar: () => void
  onVerAlerta: (alerta: Alerta) => void
}

function fmtFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

function fmtMinutos(min: number | null): string {
  if (min === null) return 'En curso'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

export default function HistorialEscalamientos({
  items,
  config,
  cargando,
  error,
  alertasPorId,
  onReintentar,
  onVerAlerta,
}: HistorialEscalamientosProps) {
  if (cargando) {
    return <p className="adm-aviso" role="status">Cargando historial de escalamientos…</p>
  }

  if (error) {
    return (
      <div className="ale-error adm-alerta" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onReintentar}>Reintentar</button>
      </div>
    )
  }

  return (
    <section className="ale-escalamientos" aria-label="Historial de alertas escaladas">
      {config && (
        <div className="ale-esc-regla">
          <span>
            Escalamiento automático activo: <strong>{config.limite_critica_min} min</strong> en alertas críticas y{' '}
            <strong>{config.limite_general_min} min</strong> en las demás alertas sin atender.
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="ale-vacio-card">
          <EstadoVacio
            className="ale-vacio"
            titulo="Sin escalamientos registrados"
            texto="Cuando una alerta supere el tiempo límite sin atención o se escale manualmente, aparecerá aquí con su trazabilidad."
          />
        </div>
      ) : (
        <div className="ale-esc-tabla-wrap">
          <table className="ale-esc-tabla">
            <thead>
              <tr>
                <th>Alerta y galpón</th>
                <th>Tipo</th>
                <th>Responsable original</th>
                <th>Escalado a</th>
                <th>Tiempo al escalar</th>
                <th>Tiempo de respuesta</th>
                <th>Estado final</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const alerta = alertasPorId.get(item.alerta_id)
                return (
                  <tr key={item.alerta_id}>
                    <td>
                      <div className="ale-esc-celda-titulo">
                        <strong>{item.tipo}</strong>
                        <span className={`ale-prioridad ale-prioridad--${item.criticidad}`}>
                          {etiquetaCriticidad(item.criticidad)}
                        </span>
                      </div>
                      <small>{item.galpon.nombre} · {fmtFecha(item.fecha_creacion)}</small>
                    </td>
                    <td>
                      <span
                        className={`ale-esc-tipo ale-esc-tipo--${item.tipo_escalamiento}`}
                      >
                        {item.tipo_escalamiento === 'automatico' ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td>{item.responsable_original}</td>
                    <td>{item.escalado_a?.nombre_completo ?? '—'}</td>
                    <td>{fmtMinutos(item.tiempo_escalamiento_min)}</td>
                    <td>{fmtMinutos(item.tiempo_respuesta_min)}</td>
                    <td>
                      <span className={`ale-estado ale-estado--${item.estado_final}`}>
                        {etiquetaEstado(item.estado_final)}
                      </span>
                    </td>
                    <td>
                      {alerta ? (
                        <button
                          type="button"
                          className="adm-btn adm-btn--secundario ale-esc-btn"
                          onClick={() => onVerAlerta(alerta)}
                        >
                          Detalle
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
