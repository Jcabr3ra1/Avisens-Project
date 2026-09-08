import type { EstadoSolicitudPqrs, SolicitudesPqrsQuery } from '../model/solicitudPqrs'
import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import { IcRefresh } from '@shared/ui/icons/icons'

type FiltroEstado = 'todos' | EstadoSolicitudPqrs

const OPCIONES_ESTADO: OpcionFiltro<FiltroEstado>[] = [
  { valor: 'todos', label: 'Todas' },
  { valor: 'abierta', label: 'Abiertas' },
  { valor: 'en_proceso', label: 'En proceso' },
  { valor: 'resuelta', label: 'Resueltas' },
  { valor: 'cerrada', label: 'Cerradas' },
]

type Props = {
  filtros: SolicitudesPqrsQuery
  cargando: boolean
  busqueda: string
  visibles: number
  total: number
  onBuscar: (valor: string) => void
  onCambiar: (filtros: SolicitudesPqrsQuery) => void
  onActualizar: () => void
}

function FiltrosSolicitudesPqrs({
  filtros,
  cargando,
  busqueda,
  visibles,
  total,
  onBuscar,
  onCambiar,
  onActualizar,
}: Props) {
  const cambiarEstado = (estado: FiltroEstado) => {
    onCambiar({
      ...filtros,
      estado: estado === 'todos' ? undefined : estado,
    })
  }

  const cambiarCategoria = (categoria: string) => {
    onCambiar({ ...filtros, categoria: categoria || undefined })
  }

  return (
    <section className="pqrs-filtros adm-panel" aria-label="Filtros de solicitudes">
      <BarraHerramientas
        busqueda={busqueda}
        placeholder="Buscar por cliente, contacto o asunto"
        etiquetaBusqueda="Buscar solicitud"
        onBuscar={onBuscar}
        filtro={filtros.estado ?? 'todos'}
        opciones={OPCIONES_ESTADO}
        etiquetaFiltro="Filtrar solicitudes por estado"
        onCambiarFiltro={cambiarEstado}
        visibles={visibles}
        total={total}
        extra={(
          <label>
            Categoría
            <select value={filtros.categoria ?? ''} onChange={(event) => cambiarCategoria(event.target.value)}>
              <option value="">Todas</option>
              <option value="Petición">Petición</option>
              <option value="Queja">Queja</option>
              <option value="Reclamo">Reclamo</option>
              <option value="Sugerencia">Sugerencia</option>
              <option value="Felicitación">Felicitación</option>
            </select>
          </label>
        )}
        acciones={(
          <button type="button" className="adm-btn adm-btn--secundario" onClick={onActualizar} disabled={cargando}>
            <IcRefresh size={16} aria-hidden="true" />
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        )}
      />
    </section>
  )
}

export default FiltrosSolicitudesPqrs
