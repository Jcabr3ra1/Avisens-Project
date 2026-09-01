import { formatearUltimaLectura } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { contarSensores, densidad, porcentajeOcupacion } from '../model/granjaDetalle'
import type { GalponDeGranja } from '../hooks/useGranjaDetalle'
import Dato from './Dato'
import PuntoEstado from './PuntoEstado'

// Las variables que el usuario espera ver primero. El resto de sensores
// (CO₂, amoníaco, luminosidad…) se muestran después, tal como estén
// registrados: el backend admite tipos libres, así que no se puede fijar
// una lista cerrada sin dejar fuera lo que cada granja instaló.
const PRIORITARIAS = ['temp', 'hum']

function PanelGalpon({ galpon }: { galpon: GalponDeGranja }) {
  const aves = galpon.loteActivo?.cantidad_inicial ?? 0
  const conteo = contarSensores(galpon.sensores)
  const densidadAves = densidad(aves, galpon.anchoMetros, galpon.largoMetros)
  const ocupacion = porcentajeOcupacion(aves, galpon.capacidadAves)

  const ordenados = [...galpon.sensores].sort((a, b) => {
    const peso = (tipo: string) =>
      PRIORITARIAS.findIndex((clave) => tipo.toLowerCase().includes(clave))
    const pa = peso(a.tipo)
    const pb = peso(b.tipo)
    return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb)
  })

  return (
    <div className="gd-panel-galpon">
      <div className="gd-bloque">
        <h4 className="gd-bloque-titulo">Operación</h4>
        <div className="gd-datos">
          <Dato etiqueta="Estado" valor={<PuntoEstado estado={galpon.estadoOperativo} />} />
          <Dato
            etiqueta="Capacidad"
            valor={galpon.capacidadAves?.toLocaleString() ?? null}
            sufijo="aves"
          />
          <Dato
            etiqueta="Aves alojadas"
            valor={galpon.loteActivo ? aves.toLocaleString() : null}
          />
          <Dato
            etiqueta="Ocupación"
            valor={ocupacion === null ? null : ocupacion.toFixed(0)}
            sufijo="%"
          />
          <Dato
            etiqueta="Densidad"
            valor={densidadAves === null ? null : densidadAves.toFixed(1)}
            sufijo="aves/m²"
          />
          <Dato etiqueta="Lote actual" valor={galpon.loteActivo?.codigo ?? null} />
        </div>
      </div>

      <div className="gd-bloque">
        <h4 className="gd-bloque-titulo">
          Ambiente
          <span className="gd-bloque-nota">
            {conteo.enLinea} de {conteo.total} sensores en línea
            {conteo.conAlerta > 0 && ` · ${conteo.conAlerta} fuera de rango`}
          </span>
        </h4>

        {galpon.sensores.length === 0 ? (
          <p className="gd-vacio-bloque">
            Este galpón todavía no tiene sensores registrados.
          </p>
        ) : (
          <ul className="gd-sensores">
            {ordenados.map((sensor) => (
              <li key={sensor.id} className={`gd-sensor gd-sensor--${sensor.estado}`}>
                <div className="gd-sensor-cabecera">
                  <span className="gd-sensor-tipo">{sensor.tipo}</span>
                  <code>{sensor.codigo}</code>
                </div>
                <span className="gd-sensor-valor">
                  {sensor.valor === null ? (
                    <span className="gd-sin-dato">Sin lectura</span>
                  ) : (
                    <>
                      {sensor.valor.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                      <small>{sensor.unidad}</small>
                    </>
                  )}
                </span>
                <span className="gd-sensor-pie">
                  {sensor.minUmbral !== null && sensor.maxUmbral !== null
                    ? `Rango ${sensor.minUmbral}–${sensor.maxUmbral} ${sensor.unidad}`
                    : 'Sin umbral configurado'}
                  {' · '}
                  {formatearUltimaLectura(sensor.ultimaLecturaTs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default PanelGalpon
