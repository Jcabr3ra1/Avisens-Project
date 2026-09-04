import { IcPin } from '@shared/ui/icons/icons'
import type { GranjaConEstructura } from '../hooks/useEstructuraGranjas'
import Badge from './Badge'

interface Props {
  estructura: GranjaConEstructura[]
  granjaId: number | null
  onSeleccionar: (id: number) => void
}

// Solo aparece si hay más de una granja: con una sola, elegir no aporta.
function SelectorGranjas({ estructura, granjaId, onSeleccionar }: Props) {
  if (estructura.length <= 1) return null

  return (
    <div className="gr-selector" role="radiogroup" aria-label="Elegir granja">
      {estructura.map(({ granja, galpones, lotesActivos }) => (
        <div
          key={granja.id}
          role="radio"
          aria-checked={granja.id === granjaId}
          tabIndex={0}
          className={`gr-selector-item${granja.id === granjaId ? ' is-activa' : ''}`}
          onClick={() => onSeleccionar(granja.id)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault()
              onSeleccionar(granja.id)
            }
          }}
        >
          <div className="gr-selector-titulo">
            <strong>{granja.nombre}</strong>
            {!granja.activa && <Badge tono="neutral" texto="Inactiva" />}
          </div>
          <span className="gr-selector-lugar">
            <IcPin size={12} aria-hidden="true" />
            {granja.municipio ?? '—'}, {granja.departamento ?? '—'}
          </span>
          <span className="gr-selector-cifras">
            {galpones.length} {galpones.length === 1 ? 'galpón' : 'galpones'} · {lotesActivos}{' '}
            {lotesActivos === 1 ? 'lote activo' : 'lotes activos'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default SelectorGranjas
