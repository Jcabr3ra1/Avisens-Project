import type { EventoSanitario } from '../api/medicinas'
import {
  diaDeEvento,
  esTipoConocido,
  etiquetaDeTipo,
  etiquetaDeVia,
  formatearFecha,
  partesDeFecha,
  tituloDeEvento,
} from '../model/medicinas'

type PermisosEventoSanitario = {
  editar: boolean
  eliminar: boolean
}

interface Props {
  eventos: EventoSanitario[]
  permisos: PermisosEventoSanitario
  onEditar: (evento: EventoSanitario) => void
  onEliminar: (evento: EventoSanitario) => void
}

function datosDeEvento(evento: EventoSanitario, titulo: string): { etiqueta: string; valor: string }[] {
  const datos: { etiqueta: string; valor: string }[] = []
  if (evento.dosis) datos.push({ etiqueta: 'Dosis', valor: evento.dosis })
  if (evento.via_aplicacion) datos.push({ etiqueta: 'Vía', valor: etiquetaDeVia(evento.via_aplicacion) })
  if (evento.cantidad_aves !== null) {
    datos.push({ etiqueta: 'Aves', valor: evento.cantidad_aves.toLocaleString('es-CO') })
  }
  // Si la enfermedad ya es el título del registro, repetirla es ruido.
  if (evento.diagnostico && evento.diagnostico.trim() !== titulo) {
    datos.push({ etiqueta: 'Motivo', valor: evento.diagnostico })
  }
  return datos
}

function HistorialMedicinas({ eventos, permisos, onEditar, onEliminar }: Props) {
  const anioActual = new Date().getFullYear()
  const hayAcciones = permisos.editar || permisos.eliminar

  return (
    <ul className="med-lista">
      {eventos.map((evento) => {
        const titulo = tituloDeEvento(evento)
        const partes = partesDeFecha(evento.fecha)
        const datos = datosDeEvento(evento, titulo)
        const claseTipo = esTipoConocido(evento.tipo) ? evento.tipo : 'otro'
        const descripcion = `${titulo}, lote ${evento.lote.codigo}, ${formatearFecha(evento.fecha)}`

        return (
          <li key={evento.id} className={`med-evento med-evento--${claseTipo}`}>
            <time className="med-fecha" dateTime={diaDeEvento(evento.fecha)}>
              {partes ? (
                <>
                  <span className="med-fecha-dia">{partes.dia}</span>
                  <span className="med-fecha-mes">{partes.mes}</span>
                  {partes.anio !== anioActual && (
                    <span className="med-fecha-anio">{partes.anio}</span>
                  )}
                </>
              ) : (
                diaDeEvento(evento.fecha)
              )}
            </time>

            <div className="med-cuerpo">
              <div className="med-cabeza">
                <strong className="med-titulo">{titulo}</strong>
                <span className={`med-badge med-badge--${claseTipo}`}>
                  <span className="med-badge-punto" aria-hidden="true" />
                  {etiquetaDeTipo(evento.tipo)}
                </span>
                <span className="med-lote">Lote {evento.lote.codigo}</span>
              </div>

              {datos.length > 0 && (
                <dl className="med-datos">
                  {datos.map((dato) => (
                    <div key={dato.etiqueta} className="med-dato">
                      <dt>{dato.etiqueta}</dt>
                      <dd>{dato.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {evento.observaciones && <p className="med-nota">{evento.observaciones}</p>}
            </div>

            {hayAcciones && (
              <div className="med-acciones">
                {permisos.editar && (
                  <button
                    type="button"
                    className="adm-btn-fila"
                    aria-label={`Editar ${descripcion}`}
                    onClick={() => onEditar(evento)}
                  >
                    Editar
                  </button>
                )}
                {permisos.eliminar && (
                  <button
                    type="button"
                    className="adm-btn-fila adm-btn-fila--peligro"
                    aria-label={`Eliminar ${descripcion}`}
                    onClick={() => onEliminar(evento)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default HistorialMedicinas
