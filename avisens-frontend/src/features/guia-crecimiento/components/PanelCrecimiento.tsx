import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import * as Tabs from '@radix-ui/react-tabs'
import { motion, useReducedMotion } from 'motion/react'
import type { CurvaCrecimiento } from '@features/predicciones/api/predicciones'
import { obtenerCurvaCrecimiento } from '@features/predicciones/api/predicciones'
import type { Lote } from '@features/lotes/api/lotes'
import { listarLotes } from '@features/lotes/api/lotes'
import { IcScale } from '@shared/ui/icons/icons'
import GraficoMetrica, { type TipoGraficaGuia } from './GraficoMetrica'
import type { IndicadorLote, PuntoCurvaGenetica } from '../api/guiaCrecimiento'
import { resumenAccesible, type ProblemaCurva } from '../model/proyeccion'

const GraficoCrecimiento = lazy(() => import('@shared/ui/graficos/GraficoCrecimiento'))

type Props = {
  loteId: number
  puedeComparar: boolean
  lote: Lote
  indicadores: IndicadorLote[]
  curvaGenetica: PuntoCurvaGenetica[]
  curva: CurvaCrecimiento | null
  diaSeleccionado: number
  problema: ProblemaCurva | null
  cargando: boolean
  onReintentar: () => void
}

function Esqueleto({ texto }: { texto: string }) {
  return (
    <div className="gcr-esqueleto" role="status">
      <span className="gcr-esqueleto-barra" />
      <span>{texto}</span>
    </div>
  )
}

function PanelCrecimiento({ loteId, puedeComparar, lote, indicadores, curvaGenetica, curva, diaSeleccionado, problema, cargando, onReintentar }: Props) {
  const [pestana, setPestana] = useState<TipoGraficaGuia>('peso')
  const [comparar, setComparar] = useState(false)
  const [lotesComparables, setLotesComparables] = useState<Lote[]>([])
  const [loteComparacionId, setLoteComparacionId] = useState('')
  const [curvaComparacion, setCurvaComparacion] = useState<CurvaCrecimiento | null>(null)
  const [cargandoComparacion, setCargandoComparacion] = useState(false)
  const [errorComparacion, setErrorComparacion] = useState('')
  const reducir = useReducedMotion()
  const referencia = curva?.referencias.genetica?.linea ?? null
  const marca = curva?.referencias.marca?.marca ?? null
  const suficiente = (curva?.modelo.puntos_usados ?? 0) >= 3

  useEffect(() => {
    if (!puedeComparar || !comparar) {
      setLotesComparables([])
      setLoteComparacionId('')
      setCurvaComparacion(null)
      setErrorComparacion('')
      return
    }
    let vigente = true
    void listarLotes().then((datos) => {
      if (!vigente) return
      const disponibles = datos.filter((item) => item.estado === 'activo' && item.id !== loteId)
      setLotesComparables(disponibles)
      setLoteComparacionId((actual) => disponibles.some((item) => String(item.id) === actual) ? actual : '')
    }).catch(() => {
      if (vigente) setErrorComparacion('No se pudieron cargar los otros lotes activos.')
    })
    return () => { vigente = false }
  }, [puedeComparar, comparar, loteId])

  useEffect(() => {
    if (!comparar || !loteComparacionId) {
      setCurvaComparacion(null)
      setCargandoComparacion(false)
      return
    }
    let vigente = true
    setCargandoComparacion(true)
    setErrorComparacion('')
    void obtenerCurvaCrecimiento(Number(loteComparacionId)).then((resultado) => {
      if (!vigente) return
      if (resultado.modelo.puntos_usados < 3) {
        setCurvaComparacion(null)
        setErrorComparacion('Ese lote todavía necesita tres pesajes para poder compararse.')
      } else {
        setCurvaComparacion(resultado)
      }
    }).catch(() => {
      if (vigente) {
        setCurvaComparacion(null)
        setErrorComparacion('No se pudo cargar la curva del lote elegido.')
      }
    }).finally(() => { if (vigente) setCargandoComparacion(false) })
    return () => { vigente = false }
  }, [comparar, loteComparacionId])

  function animarContenido(contenido: ReactNode) {
    return (
      <motion.div
        initial={reducir ? false : { opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reducir ? 0 : 0.18, ease: [0.2, 0, 0, 1] }}
      >
        {contenido}
      </motion.div>
    )
  }

  return (
    <section className="gcr" aria-label="Gráficas de crecimiento del lote">
      <Tabs.Root value={pestana} onValueChange={(valor) => setPestana(valor as TipoGraficaGuia)}>
        <div className="gcr-barra">
          <Tabs.List className="gcr-pestanas" aria-label="Métrica de crecimiento">
            {([
              ['peso', 'Peso'], ['consumo', 'Consumo'], ['mortalidad', 'Mortalidad'], ['fcr', 'FCR'], ['ambiente', 'Ambiente'],
            ] as Array<[TipoGraficaGuia, string]>).map(([valor, etiqueta]) => (
              <Tabs.Trigger key={valor} value={valor} className="gcr-pestana">
                {etiqueta}
                {pestana === valor && <motion.span aria-hidden="true" className="gcr-indicador-pestana" layoutId="gcr-indicador" transition={{ duration: reducir ? 0 : 0.18 }} />}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {puedeComparar && pestana === 'peso' && (
            <div className="gcr-comparar-controles">
              <label className="gcr-comparar-opcion">
                <input type="checkbox" checked={comparar} onChange={(evento) => setComparar(evento.target.checked)} disabled={!suficiente} />
                <span>Comparar con otro lote</span>
              </label>
              {comparar && (
                <label className="gcr-comparar-selector">
                  <span className="sr-only">Elige un lote activo</span>
                  <select value={loteComparacionId} onChange={(evento) => setLoteComparacionId(evento.target.value)}>
                    <option value="">Selecciona un lote</option>
                    {lotesComparables.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.galpon.nombre}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>

        {puedeComparar && pestana === 'peso' && (
          <>
            {!suficiente && <p className="gcr-comparar-ayuda">Registra tres pesajes para activar la comparación.</p>}
            {cargandoComparacion && <p role="status" className="gcr-comparar-ayuda">Cargando la curva del otro lote…</p>}
            {errorComparacion && <p role="status" className="gcr-comparar-ayuda">{errorComparacion}</p>}
          </>
        )}

        <Tabs.Content value="peso" className="gcr-contenido">
          {animarContenido(cargando ? <Esqueleto texto="Calculando la curva del lote…" /> : problema?.tipo === 'sin_pesajes' ? (
            <div className="gcr-vacio">
              <div className="gcr-vacio-icono" aria-hidden="true">
                <IcScale size={36} />
              </div>
              <strong>Tu lote aún no tiene pesajes registrados</strong>
              <p>
                Al registrar el primer pesaje en la bitácora, calcularemos automáticamente la curva de crecimiento,
                la comparación con el estándar de su raza y la fecha estimada de salida.
              </p>
              <div className="gcr-vacio-accion">
                <Link className="adm-btn adm-btn--primario" to={`/bitacora?lote=${loteId}&vista=peso`}>
                  + Registrar primer pesaje en Bitácora
                </Link>
              </div>
            </div>
          ) : problema?.tipo === 'error' ? (
            <div className="guia-error" role="alert">
              <span>{problema.mensaje}</span>
              {/bit[aá]cora/i.test(problema.mensaje) ? (
                <Link className="adm-btn adm-btn--primario" to={`/bitacora?lote=${loteId}&vista=peso`}>Corregir en la Bitácora</Link>
              ) : (
                <button type="button" className="adm-btn adm-btn--secundario" onClick={onReintentar}>Reintentar</button>
              )}
            </div>
          ) : curva ? (
            <>
              <div className="gcr-grafico">
                <Suspense fallback={<Esqueleto texto="Cargando gráfico…" />}>
                  <GraficoCrecimiento
                    serie={curva.serie}
                    diaActual={curva.dia_actual}
                    pesoObjetivoG={curva.peso_objetivo_g}
                    etiquetaEstandar={referencia}
                    etiquetaMarca={marca ? `Curva ${marca}` : null}
                    descripcion={resumenAccesible(curva, referencia)}
                    diaSeleccionado={diaSeleccionado}
                    mostrarProyeccion={suficiente}
                    curvaComparacion={curvaComparacion ? { codigo: curvaComparacion.codigo, serie: curvaComparacion.serie } : null}
                  />
                </Suspense>
              </div>
              {!suficiente && <p className="gcr-aviso-datos">Las proyecciones aparecen después de registrar tres pesajes en días distintos.</p>}
              {!referencia && (
                <p className="guia-aviso">
                  Este lote no tiene línea genética asignada. La proyección usa una curva típica de pollo de engorde y no se compara contra un estándar.
                </p>
              )}
              {suficiente && <p className="gcr-nota">
                Proyección calculada con {curva.modelo.puntos_usados} pesajes {referencia ? `y la curva de referencia ${referencia}` : 'y el estándar de crecimiento'}. La franja sombreada indica el rango de peso esperado.
              </p>}
            </>
          ) : null)}
        </Tabs.Content>
        {(['consumo', 'mortalidad', 'fcr', 'ambiente'] as const).map((tipo) => (
          <Tabs.Content key={tipo} value={tipo} className="gcr-contenido">
            {animarContenido(<GraficoMetrica tipo={tipo} lote={lote} indicadores={indicadores} curvaGenetica={curvaGenetica} diaActual={Math.max(1, curva?.dia_actual ?? 1)} />)}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </section>
  )
}

export default PanelCrecimiento
