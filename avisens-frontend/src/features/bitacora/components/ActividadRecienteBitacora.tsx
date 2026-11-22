import { IcAlert, IcArrowRight, IcClock, IcDrop, IcScale, IcSeed } from '@shared/ui/icons/icons'
import type { EventoRecienteBitacora, VistaBitacora } from '../model/resumenBitacora'

type Props = {
  eventos: EventoRecienteBitacora[]
  codigoLote: string
  onVerSeccion: (vista: Exclude<VistaBitacora, 'resumen'>) => void
}

function fechaCorta(fecha: string) {
  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })
}

function iconoDeTipo(tipo: EventoRecienteBitacora['tipo']) {
  if (tipo === 'peso') return IcScale
  if (tipo === 'mortalidad') return IcAlert
  if (tipo === 'sanitario') return IcDrop
  return IcSeed
}

function ActividadRecienteBitacora({ eventos, codigoLote, onVerSeccion }: Props) {
  return (
    <section className="bit-card bit-timeline-card" aria-labelledby="bit-reciente-titulo">
      <header className="bit-seccion-cab">
        <div className="bit-seccion-titulos">
          <p className="bit-kicker">Actividad reciente</p>
          <div className="bit-titulo-con-conteo">
            <h2 id="bit-reciente-titulo">Últimos movimientos</h2>
            <span className="bit-conteo">{eventos.length}</span>
          </div>
          <p className="bit-seccion-sub">
            Línea de tiempo unificada del lote <strong>{codigoLote}</strong>.
          </p>
        </div>
      </header>

      {eventos.length === 0 ? (
        <div className="bit-vacio-interno">
          <span className="bit-vacio-icono" aria-hidden="true">
            <IcClock size={20} />
          </span>
          <strong>Sin movimientos registrados todavía</strong>
          <p>Usa cualquiera de los accesos de arriba para iniciar la bitácora de este lote.</p>
        </div>
      ) : (
        <ol className="bit-timeline">
          {eventos.map((evento) => {
            const Icono = iconoDeTipo(evento.tipo)
            return (
              <li key={evento.clave} className={`bit-timeline-item bit-timeline-item--${evento.tono}`}>
                <button
                  type="button"
                  className="bit-timeline-btn"
                  onClick={() => onVerSeccion(evento.tipo)}
                >
                  <span className="bit-timeline-nodo" aria-hidden="true">
                    <Icono size={15} />
                  </span>
                  <span className="bit-timeline-cuerpo">
                    <span className="bit-timeline-linea">
                      <span className={`bit-timeline-tag bit-timeline-tag--${evento.tono}`}>
                        {evento.etiqueta}
                      </span>
                      <strong>{evento.principal}</strong>
                    </span>
                    <small>{evento.detalle}</small>
                  </span>
                  <span className="bit-timeline-meta">
                    <time>{fechaCorta(evento.fecha)}</time>
                    <IcArrowRight size={14} aria-hidden="true" />
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default ActividadRecienteBitacora
