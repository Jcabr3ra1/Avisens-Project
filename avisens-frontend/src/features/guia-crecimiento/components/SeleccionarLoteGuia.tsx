import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import { obtenerResumenCrecimiento, type LoteResumenCrecimiento, type ResumenCrecimiento } from '@features/indicadores/api/indicadores'
import { getRol } from '@shared/api'
import { ROL_ADMIN, ROL_PROPIETARIO } from '@shared/auth/permisos'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { mensajeDeError } from '@shared/utils/errores'

const formatoEntero = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })
const formatoDecimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

function peso(valor: number | null): string {
  return valor === null ? '—' : `${formatoEntero.format(valor)} g`
}

function porcentaje(valor: number | null): string {
  return valor === null ? '—' : `${valor > 0 ? '+' : ''}${formatoDecimal.format(valor)} %`
}

function esMejorPeso(lote: LoteResumenCrecimiento, filas: LoteResumenCrecimiento[]): boolean {
  const comparables = filas.filter((fila) => fila.desvio_peso_pct !== null)
  return comparables.length > 1 && lote.desvio_peso_pct !== null
    && Math.abs(lote.desvio_peso_pct) === Math.min(...comparables.map((fila) => Math.abs(fila.desvio_peso_pct!)))
}

function esMayorDesvioPeso(lote: LoteResumenCrecimiento, filas: LoteResumenCrecimiento[]): boolean {
  const comparables = filas.filter((fila) => fila.desvio_peso_pct !== null)
  return comparables.length > 1 && lote.desvio_peso_pct !== null
    && Math.abs(lote.desvio_peso_pct) === Math.max(...comparables.map((fila) => Math.abs(fila.desvio_peso_pct!)))
}

function SeleccionarLoteGuia() {
  const navegar = useNavigate()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loteId, setLoteId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [resumen, setResumen] = useState<ResumenCrecimiento | null>(null)
  const rol = getRol()
  const muestraComparacion = rol === ROL_PROPIETARIO || rol === ROL_ADMIN

  useEffect(() => {
    let vigente = true
    setCargando(true)
    setError('')
    setResumen(null)
    const carga = muestraComparacion
      ? obtenerResumenCrecimiento().then((datos) => {
        if (vigente) setResumen(datos)
      })
      : listarLotes().then((datos) => {
        if (vigente) setLotes(datos.filter((lote) => lote.estado === 'activo'))
      })
    void carga
      .catch((errorCarga) => {
        if (vigente) setError(mensajeDeError(errorCarga, muestraComparacion
          ? 'No se pudo cargar el resumen de crecimiento.'
          : 'No se pudieron cargar los lotes activos.'))
      })
      .finally(() => {
        if (vigente) setCargando(false)
      })
    return () => { vigente = false }
  }, [revision, muestraComparacion])

  const seleccionado = lotes.find((lote) => String(lote.id) === loteId)
  const lotesPorDesvio = useMemo(() => resumen?.lotes ?? [], [resumen])

  function abrirGuia(evento: FormEvent) {
    evento.preventDefault()
    if (seleccionado && !cargando && !error) {
      navegar(`/guia-crecimiento?lote=${seleccionado.id}`)
    }
  }

  if (muestraComparacion) {
    return (
      <div className="page-container adm-page guia-page">
        <CabeceraAdmin
          eyebrow="Guía de crecimiento"
          titulo="Tu granja de un vistazo"
          subtitulo="Revisa qué lotes necesitan atención y cómo va su peso frente a la curva."
          migas={[{ label: 'Granja' }, { label: 'Guía de crecimiento' }]}
        />
        {error && <div className="adm-alerta" role="alert"><span>{error}</span><button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button></div>}
        {cargando ? (
          <p className="adm-vacio" role="status">Cargando el resumen de crecimiento…</p>
        ) : resumen ? (
          <>
            <section className="guia-entrada-riesgos" aria-labelledby="guia-riesgos-titulo">
              <div className="guia-entrada-cabecera">
                <div>
                  <p className="guia-lote-badge">Atención prioritaria</p>
                  <h2 id="guia-riesgos-titulo">Lotes que necesitan revisión</h2>
                </div>
                <span>{resumen.riesgos.length} {resumen.riesgos.length === 1 ? 'lote' : 'lotes'}</span>
              </div>
              {resumen.riesgos.length === 0 ? (
                <p className="guia-entrada-vacio">No hay alertas de crecimiento con los datos y reglas disponibles.</p>
              ) : (
                <ol className="guia-riesgos-lista">
                  {resumen.riesgos.map((lote) => (
                    <li key={lote.lote_id}>
                      <Link to={`/guia-crecimiento?lote=${lote.lote_id}`} className="guia-riesgo-enlace">
                        <span className="guia-riesgo-posicion">{lote.posicion_riesgo}</span>
                        <span className="guia-riesgo-copia">
                          <strong>{lote.codigo} · {lote.motivo_principal?.titulo ?? 'Revisar crecimiento'}</strong>
                          <span>{lote.galpon} · {lote.motivo_principal?.por_que}</span>
                          <small>Qué hacer: {lote.motivo_principal?.que_hacer}</small>
                        </span>
                        <span className="guia-riesgo-abrir">Ver lote <span aria-hidden="true">›</span></span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="guia-comparacion" aria-labelledby="guia-comparacion-titulo">
              <header className="guia-entrada-cabecera">
                <div>
                  <p className="guia-lote-badge">Lotes activos</p>
                  <h2 id="guia-comparacion-titulo">Comparación entre lotes</h2>
                </div>
                <span>{resumen.lotes.length} {resumen.lotes.length === 1 ? 'lote' : 'lotes'}</span>
              </header>
              {resumen.lotes.length === 0 ? (
                <p className="guia-entrada-vacio">No hay lotes activos para comparar.</p>
              ) : (
                <div className="guia-tabla-scroll" role="region" aria-label="Comparación de lotes activos" tabIndex={0}>
                  <table className="guia-tabla-lotes">
                    <thead><tr><th>Lote</th><th>Día</th><th>Peso actual</th><th>Curva</th><th>Desvío de peso</th><th>FCR</th><th>Mortalidad</th></tr></thead>
                    <tbody>
                      {resumen.lotes.map((lote) => {
                        const mejor = esMejorPeso(lote, lotesPorDesvio)
                        const peor = esMayorDesvioPeso(lote, lotesPorDesvio)
                        return (
                          <tr key={lote.lote_id} className={mejor ? 'is-mejor' : peor ? 'is-mayor-desvio' : undefined}>
                            <th scope="row">
                              <Link to={`/guia-crecimiento?lote=${lote.lote_id}`}>{lote.codigo}</Link>
                              <small>{lote.galpon} · {lote.granja}</small>
                              {mejor && <span className="guia-tabla-distintivo">Más cerca de la curva</span>}
                              {peor && <span className="guia-tabla-distintivo">Mayor desvío de peso</span>}
                            </th>
                            <td>{lote.dia_vida === null ? '—' : `Día ${lote.dia_vida}`}</td>
                            <td>{peso(lote.peso_actual_g)}</td>
                            <td>{peso(lote.peso_esperado_g)}</td>
                            <td>{porcentaje(lote.desvio_peso_pct)}</td>
                            <td>{lote.fcr === null ? '—' : formatoDecimal.format(lote.fcr)}{lote.fcr_objetivo === null ? '' : ` / ${formatoDecimal.format(lote.fcr_objetivo)}`}</td>
                            <td>{porcentaje(lote.mortalidad_acumulada_pct)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="guia-tabla-nota">Las marcas de comparación se basan solo en el peso frente a la curva. FCR se muestra como valor actual / objetivo cuando ambos existen. «—» indica que no hay dato verificado.</p>
            </section>
            <p className="guia-umbrales-nota">Reglas provisionales por validar: mortalidad acumulada mayor a {resumen.umbrales.mortalidad_acumulada_pct_provisional} % y consumo separado más de {resumen.umbrales.desvio_consumo_pct_provisional} % de la curva genética.</p>
          </>
        ) : null}
      </div>
    )
  }

  return (
    <div className="page-container adm-page guia-page">
      <CabeceraAdmin
        eyebrow="Guía de crecimiento"
        titulo="Guía de peso"
        subtitulo="Elige un lote activo para consultar su crecimiento y planificación."
        migas={[{ label: 'Granja' }, { label: 'Guía de peso' }]}
      />
      <section className="adm-panel guia-selector" aria-labelledby="seleccionar-lote-titulo">
        <h2 id="seleccionar-lote-titulo">Selecciona un lote</h2>
        {cargando ? (
          <p className="adm-vacio" role="status">Cargando lotes activos…</p>
        ) : error ? (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setRevision((actual) => actual + 1)}>Reintentar</button>
          </div>
        ) : lotes.length === 0 ? (
          <p className="adm-aviso">No tienes lotes activos disponibles para consultar la guía.</p>
        ) : (
          <form className="guia-datos-panel" onSubmit={abrirGuia}>
            <label className="guia-campo">
              <span>Lote activo</span>
              <select value={loteId} onChange={(evento) => setLoteId(evento.target.value)} required>
                <option value="">Elige un lote</option>
                {lotes.map((lote) => (
                  <option key={lote.id} value={lote.id}>
                    {lote.codigo} · {lote.galpon.nombre} · {lote.galpon.granja.nombre}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="adm-btn adm-btn--primario" disabled={!seleccionado}>
              Ver guía de peso
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

export default SeleccionarLoteGuia
