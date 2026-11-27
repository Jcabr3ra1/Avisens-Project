import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getRol } from '@shared/api'
import { permisosOperativosDeGalpon } from '@shared/auth/permisos'
import { IcDrop, IcEdit, IcPlus, IcSun, IcThermo, IcTrash } from '@shared/ui/icons/icons'
import { VARIABLES_UMBRAL, type Umbral } from '../api/umbrales'
import { useUmbrales } from '../hooks/useUmbrales'
import {
  agruparPorVariable,
  etiquetaSemana,
  rangoLegible,
  totalDeHuecos,
} from '../model/umbralVista'
import FormularioUmbral from './FormularioUmbral'
import './UmbralesDeGalpon.css'

const UNIDAD_POR_VARIABLE: Record<string, string> = {
  temperatura: '°C',
  humedad: '%',
  luminosidad: 'lux',
}

const ETIQUETA_VARIABLE: Record<string, string> = {
  temperatura: 'Temperatura',
  humedad: 'Humedad',
  luminosidad: 'Luminosidad',
}

const ICONO_VARIABLE: Record<string, typeof IcThermo> = {
  temperatura: IcThermo,
  humedad: IcDrop,
  luminosidad: IcSun,
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
  const [variableActiva, setVariableActiva] = useState<string>(VARIABLES_UMBRAL[0])
  const [editando, setEditando] = useState<
    { variable: string; semana: number; existente: Umbral | null } | null
  >(null)
  const [cargandoSugeridos, setCargandoSugeridos] = useState(false)

  const filas = useMemo(
    () => agruparPorVariable(umbrales, VARIABLES_UMBRAL),
    [umbrales],
  )
  const huecos = totalDeHuecos(filas)
  const filaActiva = filas.find((f) => f.variable === variableActiva) ?? filas[0] ?? null

  async function cargarValoresSugeridos() {
    if (cargandoSugeridos || !permisos.configurar) return
    const confirmado = await confirmarAccion({
      titulo: '¿Cargar valores sugeridos?',
      entidad: `${huecos} umbrales`,
      descripcion:
        'Se completarán las semanas sin definir con los valores técnicos recomendados. Podrás editarlos o revisarlos en cualquier momento.',
      textoConfirmar: 'Cargar sugeridos',
      tono: 'normal',
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
      titulo: '¿Quitar este umbral?',
      entidad: `${ETIQUETA_VARIABLE[umbral.variable] ?? umbral.variable} · ${etiquetaSemana(umbral.semana_vida)}`,
      descripcion: 'Esa semana dejará de compararse y el sensor no generará alertas.',
      textoConfirmar: 'Quitar umbral',
      tono: 'aviso',
    }))) return
    void jubilar(umbral)
  }

  return (
    <div className="umb-bloque">
      {!cargando && huecos > 0 && (
        <div className="umb-aviso" role="status">
          <div className="umb-aviso-texto">
            <strong>{huecos} {huecos === 1 ? 'umbral sin definir' : 'umbrales sin definir'}.</strong>{' '}
            Mientras falten, esas lecturas no se comparan con nada y el galpón puede verse en verde aunque esté fuera de rango.
          </div>
          {permisos.configurar && (
            <button
              type="button"
              className="adm-btn adm-btn--primario umb-aviso-btn"
              onClick={() => void cargarValoresSugeridos()}
              disabled={cargandoSugeridos}
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
      ) : filaActiva ? (
        <>
          <div className="umb-variables" role="tablist" aria-label="Variables ambientales">
            {filas.map((fila) => {
              const Icono = ICONO_VARIABLE[fila.variable] ?? IcThermo
              const total = fila.celdas.length
              const definidos = total - fila.faltan
              const activa = fila.variable === filaActiva.variable
              return (
                <button
                  key={fila.variable}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`umb-var-tab${activa ? ' is-activa' : ''}`}
                  onClick={() => setVariableActiva(fila.variable)}
                >
                  <Icono size={15} aria-hidden="true" />
                  <span>{ETIQUETA_VARIABLE[fila.variable] ?? fila.variable}</span>
                  <span className={`umb-var-cuenta${fila.faltan > 0 ? ' is-pendiente' : ''}`}>
                    {definidos}/{total}
                  </span>
                </button>
              )
            })}
          </div>

          <ul className="umb-grid" aria-label={`Umbrales de ${ETIQUETA_VARIABLE[filaActiva.variable] ?? filaActiva.variable}`}>
            {filaActiva.celdas.map((celda) => {
              const umbral = celda.umbral
              return (
                <li
                  key={celda.semana}
                  className={`umb-card${umbral ? ` umb-card--${umbral.criticidad}` : ' umb-card--vacia'}`}
                >
                  <div className="umb-card-top">
                    <div>
                      <strong className="umb-card-semana">Semana {celda.semana}</strong>
                      <span className="umb-card-dias">{etiquetaSemana(celda.semana)}</span>
                    </div>
                    {umbral ? (
                      <span className={`umb-crit umb-crit--${umbral.criticidad}`}>
                        {umbral.criticidad}
                      </span>
                    ) : (
                      <span className="umb-crit umb-crit--vacia">Sin definir</span>
                    )}
                  </div>

                  {umbral ? (
                    <>
                      <div className="umb-card-rango">{rangoLegible(umbral)}</div>
                      {permisos.configurar && (
                        <div className="umb-card-acciones">
                          <button
                            type="button"
                            className="umb-card-btn"
                            onClick={() => setEditando({
                              variable: filaActiva.variable,
                              semana: celda.semana,
                              existente: umbral,
                            })}
                          >
                            <IcEdit size={13} aria-hidden="true" /> Editar
                          </button>
                          <button
                            type="button"
                            className="umb-card-btn umb-card-btn--peligro"
                            aria-label={`Quitar umbral de semana ${celda.semana}`}
                            onClick={() => void jubilarConAviso(umbral)}
                          >
                            <IcTrash size={13} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </>
                  ) : permisos.configurar ? (
                    <button
                      type="button"
                      className="umb-card-definir"
                      onClick={() => setEditando({
                        variable: filaActiva.variable,
                        semana: celda.semana,
                        existente: null,
                      })}
                    >
                      <IcPlus size={14} aria-hidden="true" />
                      Definir rango
                    </button>
                  ) : (
                    <span className="umb-sin">Sin rango configurado</span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      ) : null}

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
