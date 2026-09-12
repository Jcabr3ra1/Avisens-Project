import { useMemo, useState } from 'react'
import { getRol } from '@shared/api'
import { permisosDeGestion } from '@shared/auth/permisos'
import type { Galpon } from '../api/galpones'
import { VARIABLES_UMBRAL, type Umbral } from '../api/umbrales'
import { useUmbrales } from '../hooks/useUmbrales'
import {
  agruparPorVariable,
  etiquetaSemana,
  rangoLegible,
  SEMANAS_CICLO,
  totalDeHuecos,
} from '../model/umbralVista'
import FormularioUmbral from './FormularioUmbral'
import './UmbralesDeGalpon.css'

const UNIDAD_POR_VARIABLE: Record<string, string> = {
  temperatura: '°C',
  humedad: '%',
  luminosidad: 'lux',
}

type Props = { galpon: Galpon }

function UmbralesDeGalpon({ galpon }: Props) {
  const permisos = permisosDeGestion(getRol())
  const { umbrales, cargando, error, recargar, crear, revisar, jubilar } = useUmbrales(galpon.id)
  const [editando, setEditando] = useState<
    { variable: string; semana: number; existente: Umbral | null } | null
  >(null)

  const filas = useMemo(
    () => agruparPorVariable(umbrales, VARIABLES_UMBRAL),
    [umbrales],
  )
  const huecos = totalDeHuecos(filas)

  function jubilarConAviso(umbral: Umbral) {
    if (!window.confirm(
      `¿Jubilar el umbral de ${umbral.variable} para los ${etiquetaSemana(umbral.semana_vida).toLowerCase()}? Esa semana dejará de compararse y el sensor no generará alertas.`,
    )) return
    void jubilar(umbral)
  }

  return (
    <div className="umb-bloque">
      {/* Los huecos van arriba y con número: una semana sin umbral no es un
          hueco cosmético, es que esa lectura no se compara con nada y el
          galpón sale verde aunque esté fuera de rango. */}
      {!cargando && huecos > 0 && (
        <div className="umb-aviso" role="status">
          <strong>{huecos} {huecos === 1 ? 'semana sin umbral' : 'semanas sin umbral'}.</strong>{' '}
          Mientras falten, esas lecturas no se comparan con nada: el galpón se ve
          en verde aunque la temperatura esté fuera de rango.
        </div>
      )}

      {error && (
        <div className="umb-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      {cargando ? (
        <p className="umb-vacio" role="status">Cargando umbrales…</p>
      ) : (
        <div className="umb-scroll">
          <table className="umb-tabla">
            <thead>
              <tr>
                <th scope="col">Variable</th>
                {SEMANAS_CICLO.map((semana) => (
                  <th key={semana} scope="col">
                    <span className="umb-semana">Semana {semana}</span>
                    <span className="umb-dias">{etiquetaSemana(semana)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.variable}>
                  <th scope="row" className="umb-variable">
                    {fila.variable}
                    {fila.faltan > 0 && (
                      <span className="umb-faltan">faltan {fila.faltan}</span>
                    )}
                  </th>
                  {fila.celdas.map((celda) => (
                    <td key={celda.semana} className={celda.umbral ? '' : 'umb-celda--vacia'}>
                      {celda.umbral ? (
                        <>
                          <span className="umb-rango">{rangoLegible(celda.umbral)}</span>
                          <span className={`umb-crit umb-crit--${celda.umbral.criticidad}`}>
                            {celda.umbral.criticidad}
                          </span>
                          {permisos.editar && (
                            <span className="umb-acciones">
                              <button
                                type="button"
                                onClick={() => setEditando({
                                  variable: fila.variable,
                                  semana: celda.semana,
                                  existente: celda.umbral,
                                })}
                              >
                                Revisar
                              </button>
                              <button
                                type="button"
                                className="umb-btn--peligro"
                                onClick={() => jubilarConAviso(celda.umbral as Umbral)}
                              >
                                Jubilar
                              </button>
                            </span>
                          )}
                        </>
                      ) : permisos.crear ? (
                        <button
                          type="button"
                          className="umb-definir"
                          onClick={() => setEditando({
                            variable: fila.variable,
                            semana: celda.semana,
                            existente: null,
                          })}
                        >
                          Definir
                        </button>
                      ) : (
                        <span className="umb-sin">Sin definir</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <FormularioUmbral
          galponId={galpon.id}
          variable={editando.variable}
          semana={editando.semana}
          unidadSugerida={UNIDAD_POR_VARIABLE[editando.variable] ?? ''}
          existente={editando.existente}
          onCrear={crear}
          onRevisar={revisar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  )
}

export default UmbralesDeGalpon
