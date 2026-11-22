import { IcAlert, IcBarn, IcChevronRight, IcDrop, IcThermo } from '@shared/ui/icons/icons'
import type { GalponConLotes } from '../hooks/useEstructuraGranjas'
import { siguienteGalponPropietario, tarjetaGalpon } from './explorador'

type Props = {
  galpones: GalponConLotes[]
  totalSinFiltro: number
  galponId: number | null
  onSeleccionar: (id: number) => void
  onLimpiarFiltros: () => void
}

function ListaGalpones({ galpones, totalSinFiltro, galponId, onSeleccionar, onLimpiarFiltros }: Props) {
  if (totalSinFiltro === 0) {
    return (
      <div className="gp-lista-vacia">
        <IcBarn size={22} aria-hidden="true" />
        <strong>Esta granja todavía no tiene galpones</strong>
        <span>El soporte técnico los registra al instalar los sensores.</span>
      </div>
    )
  }

  if (galpones.length === 0) {
    return (
      <div className="gp-lista-vacia">
        <IcBarn size={22} aria-hidden="true" />
        <strong>Ningún galpón coincide con el filtro</strong>
        <span>Prueba con otra búsqueda o vuelve a ver todos los galpones.</span>
        <button type="button" className="gp-limpiar-vacio" onClick={onLimpiarFiltros}>
          Ver todos
        </button>
      </div>
    )
  }

  function alPresionarTecla(evento: React.KeyboardEvent<HTMLDivElement>) {
    const siguiente = siguienteGalponPropietario(galpones, galponId, evento.key)
    if (siguiente !== null) {
      evento.preventDefault()
      onSeleccionar(siguiente)
    }
  }

  return (
    <div
      className="gp-lista"
      role="listbox"
      aria-label="Galpones de la granja"
      onKeyDown={alPresionarTecla}
    >
      {galpones.map((galpon) => {
        const tarjeta = tarjetaGalpon(galpon)
        const seleccionado = galpon.id === galponId
        return (
          <button
            key={galpon.id}
            type="button"
            role="option"
            aria-selected={seleccionado}
            className={`gp-tarjeta gp-tarjeta--${tarjeta.estado}${seleccionado ? ' is-seleccionada' : ''}`}
            onClick={() => onSeleccionar(galpon.id)}
          >
            <span className="gp-tarjeta-cabecera">
              <span className="gp-tarjeta-nombre">
                <strong>{galpon.nombre}</strong>
                <code>{galpon.codigo}</code>
              </span>
              <span className="gp-tarjeta-derecha">
                <span className={`gp-estado gp-estado--${tarjeta.estado}`}>
                  {tarjeta.estado === 'alerta' && <IcAlert size={12} aria-hidden="true" />}
                  {tarjeta.etiquetaEstado}
                </span>
                <IcChevronRight size={15} className="gp-tarjeta-flecha" aria-hidden="true" />
              </span>
            </span>

            <span className="gp-tarjeta-lote">{tarjeta.lote ?? 'Sin lote en curso'}</span>

            {(tarjeta.temperatura || tarjeta.humedad) && (
              <span className="gp-tarjeta-lecturas">
                {tarjeta.temperatura && (
                  <span><IcThermo size={13} aria-hidden="true" />{tarjeta.temperatura}</span>
                )}
                {tarjeta.humedad && (
                  <span><IcDrop size={13} aria-hidden="true" />{tarjeta.humedad}</span>
                )}
              </span>
            )}

            {tarjeta.ocupacion !== null && (
              <span className="gp-ocupacion">
                <span className="gp-ocupacion-texto">
                  {tarjeta.aves.toLocaleString('es-CO')} aves · {Math.round(tarjeta.ocupacion)} % de la capacidad
                </span>
                <span className="gp-ocupacion-barra" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, tarjeta.ocupacion)}%` }} />
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default ListaGalpones
