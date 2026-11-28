import { IcAlert, IcCheck, IcClock, IcEye } from '@shared/ui/icons/icons'
import type { Alerta } from '../api/alertas'
import { etiquetaCriticidad, etiquetaEstado } from '../model/alerta'
import EstadoVacio from '@shared/ui/Estados/EstadoVacio'

interface ListaAlertasProps {
  alertas: Alerta[]
  hayAlertas: boolean
  embebida?: boolean
  onLimpiarFiltros: () => void
  actualizandoId: number | null
  onAtender: (id: number) => void
  onVerDetalle: (alerta: Alerta) => void
}

function fecha(fechaIso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fechaIso))
}

function ListaAlertas({
  alertas,
  hayAlertas,
  embebida = false,
  onLimpiarFiltros,
  actualizandoId,
  onAtender,
  onVerDetalle,
}: ListaAlertasProps) {
  if (alertas.length === 0) {
    return hayAlertas ? (
      <div className="ale-vacio-card">
        <EstadoVacio
          className="ale-vacio"
          titulo="Sin coincidencias"
          texto="Ninguna alerta coincide con estos filtros."
          accion={<button type="button" className="adm-btn adm-btn--secundario" onClick={onLimpiarFiltros}>Limpiar filtros</button>}
        />
      </div>
    ) : (
      <div className="ale-vacio-card">
        <EstadoVacio
          className="ale-vacio"
          titulo="Todo en orden"
          texto="Los sensores no han detectado situaciones fuera de rango."
        />
      </div>
    )
  }

  return (
    <section className="ale-lista" aria-label="Listado de alertas">
      {alertas.map((alerta) => {
        const actualizando = actualizandoId === alerta.id
        return (
          <article key={alerta.id} className={`ale-card ale-card--${alerta.criticidad} ale-card--${alerta.estado}`}>
            <span className="ale-card-barra" aria-hidden="true" />
            <div className="ale-card-contenido">
              <div className="ale-card-encabezado">
                <span className={`ale-prioridad ale-prioridad--${alerta.criticidad}`}><IcAlert size={13} aria-hidden="true" /> {etiquetaCriticidad(alerta.criticidad)}</span>
                <span className={`ale-estado ale-estado--${alerta.estado}`}><IcClock size={13} aria-hidden="true" /> {etiquetaEstado(alerta.estado)}</span>
                <time>{fecha(alerta.fecha_creacion)}</time>
              </div>
              <h2>{embebida ? alerta.tipo : `${alerta.tipo} · ${alerta.galpon.nombre}`}</h2>
              <p>{alerta.mensaje ?? 'Se detectó una lectura fuera del rango configurado.'}</p>
              <dl className="ale-datos">
                <div><dt>Lectura</dt><dd>{alerta.valor_detectado ?? '—'}</dd></div>
                <div><dt>Límite</dt><dd>{alerta.valor_umbral ?? '—'}</dd></div>
                <div><dt>Sensor</dt><dd>{alerta.sensor?.codigo ?? 'Sin sensor'}</dd></div>
                <div><dt>Responsable</dt><dd>{alerta.responsable?.nombre_completo ?? 'Sin asignar'}</dd></div>
                {alerta.escalado_a && (
                  <div><dt>Escalada a</dt><dd>{alerta.escalado_a.nombre_completo}</dd></div>
                )}
              </dl>
            </div>
            <div className="ale-card-acciones">
              <button type="button" className="adm-btn adm-btn--secundario" onClick={() => onVerDetalle(alerta)}>
                <IcEye size={14} aria-hidden="true" /> Detalle
              </button>
              {alerta.estado === 'abierta' && (
                <button
                  type="button"
                  className="adm-btn adm-btn--primario"
                  onClick={() => onAtender(alerta.id)}
                  disabled={actualizando}
                >
                  <IcCheck size={14} aria-hidden="true" /> {actualizando ? 'Tomando…' : 'Atender'}
                </button>
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default ListaAlertas
