import type { EstadoSolicitudPqrs, SolicitudesPqrsQuery } from '../model/solicitudPqrs'

type Props = {
  filtros: SolicitudesPqrsQuery
  cargando: boolean
  onCambiar: (filtros: SolicitudesPqrsQuery) => void
  onActualizar: () => void
}

function FiltrosSolicitudesPqrs({ filtros, cargando, onCambiar, onActualizar }: Props) {
  const cambiarEstado = (estado: string) => {
    onCambiar({
      ...filtros,
      estado: estado ? (estado as EstadoSolicitudPqrs) : undefined,
    })
  }

  const cambiarCategoria = (categoria: string) => {
    onCambiar({ ...filtros, categoria: categoria || undefined })
  }

  return (
    <section className="pqrs-filtros" aria-label="Filtros de solicitudes">
      <label>
        <span>Estado</span>
        <select value={filtros.estado ?? ''} onChange={(event) => cambiarEstado(event.target.value)}>
          <option value="">Todos los estados</option>
          <option value="abierta">Abierta</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelta">Resuelta</option>
          <option value="cerrada">Cerrada</option>
        </select>
      </label>

      <label>
        <span>Categoría</span>
        <select value={filtros.categoria ?? ''} onChange={(event) => cambiarCategoria(event.target.value)}>
          <option value="">Todas las categorías</option>
          <option value="Petición">Petición</option>
          <option value="Queja">Queja</option>
          <option value="Reclamo">Reclamo</option>
          <option value="Sugerencia">Sugerencia</option>
          <option value="Felicitación">Felicitación</option>
        </select>
      </label>

      <button type="button" className="pqrs-boton-secundario" onClick={onActualizar} disabled={cargando}>
        {cargando ? 'Actualizando…' : 'Actualizar listado'}
      </button>
    </section>
  )
}

export default FiltrosSolicitudesPqrs
