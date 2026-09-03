import { IcSearch } from '@shared/ui/icons/icons'

export type OpcionFiltro<T extends string> = {
  valor: T
  label: string
}

interface Props<T extends string> {
  busqueda: string
  placeholder: string
  etiquetaBusqueda: string
  onBuscar: (valor: string) => void
  filtro: T
  opciones: OpcionFiltro<T>[]
  etiquetaFiltro: string
  onCambiarFiltro: (valor: T) => void
  visibles: number
  total: number
}

function BarraHerramientas<T extends string>({
  busqueda,
  placeholder,
  etiquetaBusqueda,
  onBuscar,
  filtro,
  opciones,
  etiquetaFiltro,
  onCambiarFiltro,
  visibles,
  total,
}: Props<T>) {
  return (
    <div className="adm-barra">
      <div className="adm-buscador">
        <IcSearch size={15} aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          onChange={(evento) => onBuscar(evento.target.value)}
          placeholder={placeholder}
          aria-label={etiquetaBusqueda}
        />
      </div>

      <div className="adm-segmentos" role="group" aria-label={etiquetaFiltro}>
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            className="adm-segmento"
            aria-pressed={filtro === opcion.valor}
            onClick={() => onCambiarFiltro(opcion.valor)}
          >
            {opcion.label}
          </button>
        ))}
      </div>

      <span className="adm-conteo">
        {visibles === total ? `${total}` : `${visibles} de ${total}`}
      </span>
    </div>
  )
}

export default BarraHerramientas
