import { ETIQUETA_ESTADO, type EstadoOperativo } from '../model/granjaDetalle'

// El semáforo. Va siempre acompañado del texto: el color solo no es
// accesible para quien no lo distingue.
function PuntoEstado({ estado, conTexto = true }: { estado: EstadoOperativo; conTexto?: boolean }) {
  return (
    <span className={`gd-estado gd-estado--${estado}`}>
      <span className="gd-estado-punto" aria-hidden="true" />
      {conTexto && ETIQUETA_ESTADO[estado]}
    </span>
  )
}

export default PuntoEstado
