import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getRol } from '@shared/api'
import { permisosOperativosDeGalpon } from '@shared/auth/permisos'
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

const VALORES_SUGERIDOS: Record<
  string,
  { min: number; max: number; unidad: string; criticidad: 'baja' | 'media' | 'alta' }[]
> = {
  temperatura: [
    { min: 32, max: 34, unidad: '°C', criticidad: 'alta' },
    { min: 30, max: 32, unidad: '°C', criticidad: 'alta' },
    { min: 27, max: 29, unidad: '°C', criticidad: 'alta' },
    { min: 24, max: 26, unidad: '°C', criticidad: 'media' },
    { min: 22, max: 24, unidad: '°C', criticidad: 'media' },
    { min: 20, max: 22, unidad: '°C', criticidad: 'media' },
    { min: 19, max: 21, unidad: '°C', criticidad: 'baja' },
  ],
  humedad: [
    { min: 55, max: 70, unidad: '%', criticidad: 'media' },
    { min: 55, max: 70, unidad: '%', criticidad: 'media' },
    { min: 50, max: 65, unidad: '%', criticidad: 'media' },
    { min: 50, max: 65, unidad: '%', criticidad: 'media' },
    { min: 50, max: 65, unidad: '%', criticidad: 'media' },
    { min: 50, max: 65, unidad: '%', criticidad: 'media' },
    { min: 50, max: 65, unidad: '%', criticidad: 'baja' },
  ],
  luminosidad: [
    { min: 30, max: 40, unidad: 'lux', criticidad: 'media' },
    { min: 20, max: 30, unidad: 'lux', criticidad: 'media' },
    { min: 10, max: 20, unidad: 'lux', criticidad: 'baja' },
    { min: 10, max: 20, unidad: 'lux', criticidad: 'baja' },
    { min: 10, max: 20, unidad: 'lux', criticidad: 'baja' },
    { min: 10, max: 20, unidad: 'lux', criticidad: 'baja' },
    { min: 10, max: 20, unidad: 'lux', criticidad: 'baja' },
  ],
}

type Props = { galpon: { id: number } }

function UmbralesDeGalpon({ galpon }: Props) {
  const permisos = permisosOperativosDeGalpon(getRol())
  const { umbrales, cargando, error, recargar, crear, revisar, jubilar } = useUmbrales(galpon.id)
  const [editando, setEditando] = useState<
    { variable: string; semana: number; existente: Umbral | null } | null
  >(null)
  const [cargandoSugeridos, setCargandoSugeridos] = useState(false)

  const filas = useMemo(
    () => agruparPorVariable(umbrales, VARIABLES_UMBRAL),
    [umbrales],
  )
  const huecos = totalDeHuecos(filas)

  async function cargarValoresSugeridos() {
    if (cargandoSugeridos || !permisos.configurar) return
    const confirmado = await confirmarAccion({
      titulo: '¿Cargar valores sugeridos?',
      entidad: `${huecos} umbrales`,
      descripcion:
        'Se completarán las semanas sin definir con los valores técnicos recomendados. Podrás editarlos o revisarlos en cualquier momento.',
      textoConfirmar: 'Cargar sugeridos',
      tono: 'info',
    })
    if (!confirmado) return

    setCargandoSugeridos(true)
    try {
      for (const fila of filas) {
        const sugeridosVar = VALORES_SUGERIDOS[fila.variable]
        if (!sugeridosVar) continue
        for (const celda of fila.celdas) {
          if (!celda.umbral) {
            const sug = sugeridosVar[celda.semana]
            if (sug) {
              await crear({
                galpon_id: galpon.id,
                variable: fila.variable,
                semana_vida: celda.semana,
                valor_minimo: sug.min,
                valor_maximo: sug.max,
                unidad: sug.unidad,
                criticidad: sug.criticidad,
              })
            }
          }
        }
      }
      toast.success('Valores sugeridos cargados')
    } catch {
      toast.error('Ocurrió un problema al cargar algunos valores sugeridos')
    } finally {
      setCargandoSugeridos(false)
    }
  }

  async function jubilarConAviso(umbral: Umbral) {
    if (!(await confirmarAccion({
      titulo: '¿Jubilar este umbral?',
      entidad: `${umbral.variable} · ${etiquetaSemana(umbral.semana_vida)}`,
      descripcion: 'Esa semana dejará de compararse y el sensor no generará alertas.',
      textoConfirmar: 'Jubilar umbral',
      tono: 'aviso',
    }))) return
    void jubilar(umbral)
  }

  return (
    <div className="umb-bloque">
      {/* Los huecos van arriba y con número: una semana sin umbral no es un
          hueco cosmético, es que esa lectura no se compara con nada y el
          galpón sale verde aunque esté fuera de rango. */}
      {!cargando && huecos > 0 && (
        <div
          className="umb-aviso"
          role="status"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-3)',
          }}
        >
          <div>
            <strong>{huecos} {huecos === 1 ? 'umbral sin definir' : 'umbrales sin definir'}.</strong>{' '}
            Mientras falten, esas lecturas no se comparan con nada: el galpón se ve
            en verde aunque la temperatura esté fuera de rango.
          </div>
          {permisos.configurar && (
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={() => void cargarValoresSugeridos()}
              disabled={cargandoSugeridos}
              style={{
                fontSize: '0.85rem',
                padding: 'var(--space-1) var(--space-3)',
                whiteSpace: 'nowrap',
              }}
            >
              {cargandoSugeridos ? 'Cargando sugeridos…' : 'Cargar valores sugeridos'}
            </button>
          )}
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
                          {permisos.configurar && (
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
                      ) : permisos.configurar ? (
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
