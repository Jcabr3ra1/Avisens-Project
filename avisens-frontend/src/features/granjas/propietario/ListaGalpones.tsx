import { IcAlert, IcBarn, IcDrop, IcThermo } from '@shared/ui/icons/icons'
import type { GalponConLotes } from '../hooks/useEstructuraGranjas'
import { tarjetaGalpon } from './explorador'

type Props = {
  galpones: GalponConLotes[]
  galponId: number | null
  onSeleccionar: (id: number) => void
}

function ListaGalpones({ galpones, galponId, onSeleccionar }: Props) {
  if (galpones.length === 0) {
    return (
      <div className="gp-lista-vacia">
        <IcBarn size={22} aria-hidden="true" />
        <strong>Esta granja todavía no tiene galpones</strong>
        <span>El administrador los registra al instalar los sensores.</span>
      </div>
    )
  }

  return (
    <ul className="gp-lista" aria-label="Galpones de la granja">
      {galpones.map((galpon) => {
        const tarjeta = tarjetaGalpon(galpon)
        const seleccionado = galpon.id === galponId
        return (
          <li key={galpon.id}>
            <button
              type="button"
              className={`gp-tarjeta gp-tarjeta--${tarjeta.estado}${seleccionado ? ' is-seleccionada' : ''}`}
              aria-pressed={seleccionado}
              onClick={() => onSeleccionar(galpon.id)}
            >
              <span className="gp-tarjeta-cabecera">
                <span className="gp-tarjeta-nombre">
                  <strong>{galpon.nombre}</strong>
                  <code>{galpon.codigo}</code>
                </span>
                <span className={`gp-estado gp-estado--${tarjeta.estado}`}>
                  {tarjeta.estado === 'alerta' && <IcAlert size={12} aria-hidden="true" />}
                  {tarjeta.etiquetaEstado}
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
          </li>
        )
      })}
    </ul>
  )
}

export default ListaGalpones
