import { IcAlert, IcCheck, IcClock, IcEye } from '@shared/ui/icons/icons'
import type { Alerta } from '../api/alertas'
import { etiquetaCriticidad, etiquetaEstado } from '../model/alerta'

interface ListaAlertasProps {
  alertas: Alerta[]
  actualizandoId: number | null
  onAtender: (id: number) => void
  onVerDetalle: (alerta: Alerta) => void
}

function fecha(fechaIso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(fechaIso))
}

function ListaAlertas({ alertas, actualizandoId, onAtender, onVerDetalle }: ListaAlertasProps) {
  if (alertas.length === 0) {
    return <div className="ale-vacio"><IcCheck size={28} /><strong>No hay alertas con estos filtros</strong><span>El sistema no encontró situaciones pendientes en esta vista.</span></div>
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
                <span className={`ale-prioridad ale-prioridad--${alerta.criticidad}`}><IcAlert size={14} /> {etiquetaCriticidad(alerta.criticidad)}</span>
                <span className="ale-estado"><IcClock size={14} /> {etiquetaEstado(alerta.estado)}</span>
                <time>{fecha(alerta.fecha_creacion)}</time>
              </div>
              <h2>{alerta.tipo} · {alerta.galpon.nombre}</h2>
              <p>{alerta.mensaje ?? 'Se detectó una lectura fuera del rango configurado.'}</p>
              <dl className="ale-datos">
                <div><dt>Lectura</dt><dd>{alerta.valor_detectado ?? '—'}</dd></div>
                <div><dt>Límite</dt><dd>{alerta.valor_umbral ?? '—'}</dd></div>
                <div><dt>Sensor</dt><dd>{alerta.sensor?.codigo ?? 'Sin sensor asociado'}</dd></div>
                <div><dt>Responsable</dt><dd>{alerta.responsable?.nombre_completo ?? 'Sin asignar'}</dd></div>
              </dl>
            </div>
            <div className="ale-card-acciones">
              <button type="button" className="ale-btn ale-btn--secundario" onClick={() => onVerDetalle(alerta)}><IcEye size={15} /> Detalle</button>
              {alerta.estado === 'abierta' && <button type="button" className="ale-btn ale-btn--principal" onClick={() => onAtender(alerta.id)} disabled={actualizando}><IcCheck size={15} /> {actualizando ? 'Tomando…' : 'Atender'}</button>}
            </div>
          </article>
        )
      })}
    </section>
  )
}

export default ListaAlertas
