import BarraHerramientas, { type OpcionFiltro } from '@shared/ui/admin/BarraHerramientas'
import { TIPOS_EVENTO, type FiltroTipo } from '../model/medicinas'

const OPCIONES_TIPO: OpcionFiltro<FiltroTipo>[] = [
  { valor: 'todos', label: 'Todos' },
  ...TIPOS_EVENTO.map((tipo) => ({ valor: tipo.valor, label: tipo.etiqueta })),
]

interface Props {
  busqueda: string
  onBuscar: (valor: string) => void
  tipo: FiltroTipo
  onCambiarTipo: (valor: FiltroTipo) => void
  loteId: number
  onCambiarLote: (valor: number) => void
  lotes: { id: number; codigo: string }[]
  visibles: number
  total: number
}

function FiltrosMedicinas({
  busqueda,
  onBuscar,
  tipo,
  onCambiarTipo,
  loteId,
  onCambiarLote,
  lotes,
  visibles,
  total,
}: Props) {
  return (
    <BarraHerramientas
      busqueda={busqueda}
      placeholder="Buscar por producto, enfermedad o lote"
      etiquetaBusqueda="Buscar en el historial sanitario"
      onBuscar={onBuscar}
      filtro={tipo}
      opciones={OPCIONES_TIPO}
      etiquetaFiltro="Filtrar por tipo de registro"
      onCambiarFiltro={onCambiarTipo}
      visibles={visibles}
      total={total}
      extra={
        lotes.length > 1 ? (
          <label>
            Lote
            <select
              value={loteId}
              onChange={(evento) => onCambiarLote(Number(evento.target.value))}
            >
              <option value={0}>Todos</option>
              {lotes.map((lote) => (
                <option key={lote.id} value={lote.id}>
                  {lote.codigo}
                </option>
              ))}
            </select>
          </label>
        ) : undefined
      }
    />
  )
}

export default FiltrosMedicinas
