import { IcAlert, IcDrop, IcThermo } from '@shared/ui/icons/icons'
import { lecturaPorTipo, porcentajeOcupacion } from '../model/granjaDetalle'
import type { GalponDeGranja } from '../hooks/useGranjaDetalle'
import PuntoEstado from './PuntoEstado'

interface Props {
  galpon: GalponDeGranja
  seleccionado: boolean
  onSeleccionar: () => void
}

function formatearLectura(valor: number | null, unidad: string): string {
  if (valor === null) return '—'
  return `${valor.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unidad}`
}

// Tarjeta seleccionable, no botón: se comporta como una opción de una lista
// (role=radio) porque solo puede haber un galpón activo a la vez.
function TarjetaGalpon({ galpon, seleccionado, onSeleccionar }: Props) {
  const temperatura = lecturaPorTipo(galpon.sensores, 'temp')
  const humedad = lecturaPorTipo(galpon.sensores, 'hum')
  const aves = galpon.loteActivo?.cantidad_inicial ?? 0
  const ocupacion = porcentajeOcupacion(aves, galpon.capacidadAves)

  return (
    <div
      role="radio"
      aria-checked={seleccionado}
      tabIndex={0}
      className={`gd-galpon${seleccionado ? ' is-seleccionado' : ''}`}
      onClick={onSeleccionar}
      onKeyDown={(evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
          evento.preventDefault()
          onSeleccionar()
        }
      }}
    >
      <span className={`gd-galpon-filo gd-filo--${galpon.estadoOperativo}`} aria-hidden="true" />

      <header className="gd-galpon-cabecera">
        <div>
          <h3>{galpon.nombre}</h3>
          <code>{galpon.codigo}</code>
        </div>
        <PuntoEstado estado={galpon.estadoOperativo} />
      </header>

      <div className="gd-galpon-lecturas">
        <span title="Temperatura">
          <IcThermo size={14} aria-hidden="true" />
          {formatearLectura(temperatura?.valor ?? null, temperatura?.unidad ?? '°C')}
        </span>
        <span title="Humedad">
          <IcDrop size={14} aria-hidden="true" />
          {formatearLectura(humedad?.valor ?? null, humedad?.unidad ?? '%')}
        </span>
        {galpon.alertasAbiertas > 0 && (
          <span className="gd-galpon-alertas" title="Alertas abiertas">
            <IcAlert size={14} aria-hidden="true" />
            {galpon.alertasAbiertas}
          </span>
        )}
      </div>

      <div className="gd-galpon-ocupacion">
        <div className="gd-barra" aria-hidden="true">
          <span style={{ width: `${Math.min(ocupacion ?? 0, 100)}%` }} />
        </div>
        <span className="gd-galpon-pie">
          {galpon.loteActivo ? (
            <>
              <strong>{aves.toLocaleString()}</strong> aves
              {galpon.capacidadAves !== null && ` de ${galpon.capacidadAves.toLocaleString()}`}
              {' · '}
              {galpon.loteActivo.codigo}
            </>
          ) : (
            'Sin lote activo'
          )}
        </span>
      </div>
    </div>
  )
}

export default TarjetaGalpon
