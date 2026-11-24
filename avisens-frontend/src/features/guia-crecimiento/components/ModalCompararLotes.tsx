import { useEffect, useState, useMemo } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import { listarLotes, type Lote } from '@features/lotes/api/lotes'
import {
  compararLotes,
  type RespuestaComparacionLotes,
} from '../api/guiaCrecimiento'
import { gramosALibras } from '@features/lotes/model/pesoObjetivo'
import './ModalCompararLotes.css'

interface Props {
  loteActualId?: number
  onCerrar: () => void
}

export default function ModalCompararLotes({ loteActualId, onCerrar }: Props) {
  const [lotes, setLotes] = useState<Lote[]>([])
  const [cargandoLotes, setCargandoLotes] = useState(true)
  const [lote1Id, setLote1Id] = useState<string>(loteActualId ? String(loteActualId) : '')
  const [lote2Id, setLote2Id] = useState<string>('')
  const [comparacion, setComparacion] = useState<RespuestaComparacionLotes | null>(null)
  const [cargandoComparacion, setCargandoComparacion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tieneLoteFinalizado = useMemo(() => lotes.some((l) => l.estado === 'finalizado'), [lotes])

  useEffect(() => {
    let activo = true
    setCargandoLotes(true)
    listarLotes()
      .then((datos) => {
        if (!activo) return
        setLotes(datos)
        if (datos.length > 0) {
          const primerLoteId = loteActualId ? String(loteActualId) : String(datos[0].id)
          setLote1Id((actual) => actual || primerLoteId)
          const hayFinalizado = datos.some((d) => d.estado === 'finalizado')
          if (hayFinalizado) {
            const finalizado = datos.find((d) => String(d.id) !== primerLoteId && d.estado === 'finalizado')
            const segundo = finalizado ?? datos.find((d) => String(d.id) !== primerLoteId)
            if (segundo) setLote2Id(String(segundo.id))
          }
        }
      })
      .catch((err) => {
        if (activo) setError(mensajeDeError(err, 'No se pudieron cargar los lotes disponibles.'))
      })
      .finally(() => {
        if (activo) setCargandoLotes(false)
      })

    return () => {
      activo = false
    }
  }, [loteActualId])

  useEffect(() => {
    if (!tieneLoteFinalizado || !lote1Id || !lote2Id || lote1Id === lote2Id) {
      setComparacion(null)
      return
    }

    let activo = true
    setCargandoComparacion(true)
    setError(null)

    compararLotes(Number(lote1Id), Number(lote2Id))
      .then((res) => {
        if (activo) setComparacion(res)
      })
      .catch((err) => {
        if (activo) {
          setComparacion(null)
          setError(mensajeDeError(err, 'No se pudo realizar la comparación de lotes.'))
        }
      })
      .finally(() => {
        if (activo) setCargandoComparacion(false)
      })

    return () => {
      activo = false
    }
  }, [lote1Id, lote2Id])

  function imprimir() {
    window.print()
  }

  const opcionesLote1 = useMemo(() => {
    return lotes.map((l) => ({
      id: l.id,
      label: `${l.codigo} · ${l.galpon.nombre} (${l.estado})`,
    }))
  }, [lotes])

  const opcionesLote2 = useMemo(() => {
    return lotes
      .filter((l) => String(l.id) !== lote1Id)
      .map((l) => ({
        id: l.id,
        label: `${l.codigo} · ${l.galpon.nombre} (${l.estado})`,
      }))
  }, [lotes, lote1Id])

  return (
    <Modal
      titulo="Comparativa histórica de lotes"
      subtitulo="Evalúa diferencias de rendimiento y eficiencia zootécnica entre galpones y ciclos productivos (HU-29). Requiere al menos un lote finalizado."
      onCerrar={onCerrar}
      ancho="ancho"
      acciones={
        <>
          <button
            type="button"
            className="modal-btn modal-btn--secondary"
            onClick={onCerrar}
          >
            Cerrar
          </button>
          {comparacion && (
            <button
              type="button"
              className="modal-btn modal-btn--primary"
              onClick={imprimir}
            >
              Imprimir / Guardar PDF
            </button>
          )}
        </>
      }
    >
      <div className="modal-comparar-container mcl-imprimible">
        <div className="mcl-selectores">
          <div className="mcl-campo">
            <label htmlFor="selector-lote-1">Lote Base (1)</label>
            <select
              id="selector-lote-1"
              value={lote1Id}
              onChange={(e) => {
                setLote1Id(e.target.value)
                if (e.target.value === lote2Id) setLote2Id('')
              }}
              disabled={cargandoLotes || cargandoComparacion || !tieneLoteFinalizado}
            >
              <option value="">Selecciona un lote…</option>
              {opcionesLote1.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mcl-campo">
            <label htmlFor="selector-lote-2">Lote a Comparar (2)</label>
            <select
              id="selector-lote-2"
              value={lote2Id}
              onChange={(e) => setLote2Id(e.target.value)}
              disabled={cargandoLotes || cargandoComparacion || !lote1Id || !tieneLoteFinalizado}
            >
              <option value="">Selecciona un lote…</option>
              {opcionesLote2.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!cargandoLotes && !tieneLoteFinalizado && (
          <div className="adm-alerta adm-alerta--aviso" role="status" style={{ marginTop: '0.75rem' }}>
            <span>La comparación de galpones requiere que haya al menos un lote finalizado en el sistema.</span>
          </div>
        )}

        {error && (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
          </div>
        )}

        {cargandoComparacion && (
          <p className="adm-aviso" role="status">
            Cruzando series temporales e indicadores de ambos lotes…
          </p>
        )}

        {comparacion && (
          <>
            <div className="mcl-kpis-grid">
              {/* Card Lote 1 */}
              <div className="mcl-kpi-card mcl-kpi-card--1">
                <div className="mcl-kpi-header">
                  <div>
                    <span className="mcl-kpi-sub">Lote Base · {comparacion.lote_1.granja}</span>
                    <h4 className="mcl-kpi-titulo">{comparacion.lote_1.codigo}</h4>
                  </div>
                  <span className="tg-badge tg-badge--ok">{comparacion.lote_1.estado}</span>
                </div>
                <dl className="mcl-kpi-lista">
                  <div className="mcl-kpi-item">
                    <dt>Duración del ciclo</dt>
                    <dd>{comparacion.lote_1.duracion_dias} días</dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Aves iniciales / Vendidas</dt>
                    <dd>
                      {comparacion.lote_1.cantidad_inicial.toLocaleString()} /{' '}
                      {comparacion.lote_1.cantidad_aves_vendidas?.toLocaleString() ?? '—'}
                    </dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Peso promedio final</dt>
                    <dd>
                      {comparacion.lote_1.peso_promedio_final_g
                        ? `${comparacion.lote_1.peso_promedio_final_g.toLocaleString()} g (${gramosALibras(comparacion.lote_1.peso_promedio_final_g).toFixed(2)} lb)`
                        : '—'}
                    </dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Mortalidad final</dt>
                    <dd>
                      {comparacion.lote_1.mortalidad_acumulada_final_pct !== null
                        ? `${comparacion.lote_1.mortalidad_acumulada_final_pct}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Conversión (FCR)</dt>
                    <dd>{comparacion.lote_1.fcr_final ?? '—'}</dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Galpón</dt>
                    <dd>{comparacion.lote_1.galpon}</dd>
                  </div>
                </dl>
              </div>

              {/* Card Lote 2 */}
              <div className="mcl-kpi-card mcl-kpi-card--2">
                <div className="mcl-kpi-header">
                  <div>
                    <span className="mcl-kpi-sub">Lote Comparado · {comparacion.lote_2.granja}</span>
                    <h4 className="mcl-kpi-titulo">{comparacion.lote_2.codigo}</h4>
                  </div>
                  <span className="tg-badge tg-badge--ok">{comparacion.lote_2.estado}</span>
                </div>
                <dl className="mcl-kpi-lista">
                  <div className="mcl-kpi-item">
                    <dt>Duración del ciclo</dt>
                    <dd>{comparacion.lote_2.duracion_dias} días</dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Aves iniciales / Vendidas</dt>
                    <dd>
                      {comparacion.lote_2.cantidad_inicial.toLocaleString()} /{' '}
                      {comparacion.lote_2.cantidad_aves_vendidas?.toLocaleString() ?? '—'}
                    </dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Peso promedio final</dt>
                    <dd>
                      {comparacion.lote_2.peso_promedio_final_g
                        ? `${comparacion.lote_2.peso_promedio_final_g.toLocaleString()} g (${gramosALibras(comparacion.lote_2.peso_promedio_final_g).toFixed(2)} lb)`
                        : '—'}
                    </dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Mortalidad final</dt>
                    <dd>
                      {comparacion.lote_2.mortalidad_acumulada_final_pct !== null
                        ? `${comparacion.lote_2.mortalidad_acumulada_final_pct}%`
                        : '—'}
                    </dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Conversión (FCR)</dt>
                    <dd>{comparacion.lote_2.fcr_final ?? '—'}</dd>
                  </div>
                  <div className="mcl-kpi-item">
                    <dt>Galpón</dt>
                    <dd>{comparacion.lote_2.galpon}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Tabla comparativa día por día */}
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0.75rem 0 0.5rem' }}>
                Evolución diaria por día de vida ({comparacion.dias_totales} días registrados)
              </h4>
              <div className="mcl-tabla-wrap">
                <table className="mcl-tabla">
                  <thead>
                    <tr>
                      <th rowSpan={2}>Día</th>
                      <th colSpan={2}>Peso Promedio (g)</th>
                      <th colSpan={2}>Mortalidad Acum. (%)</th>
                      <th colSpan={2}>Alimento Acum. (kg)</th>
                      <th colSpan={2}>FCR</th>
                    </tr>
                    <tr>
                      <th className="mcl-l1">{comparacion.lote_1.codigo}</th>
                      <th className="mcl-l2">{comparacion.lote_2.codigo}</th>
                      <th className="mcl-l1">{comparacion.lote_1.codigo}</th>
                      <th className="mcl-l2">{comparacion.lote_2.codigo}</th>
                      <th className="mcl-l1">{comparacion.lote_1.codigo}</th>
                      <th className="mcl-l2">{comparacion.lote_2.codigo}</th>
                      <th className="mcl-l1">{comparacion.lote_1.codigo}</th>
                      <th className="mcl-l2">{comparacion.lote_2.codigo}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparacion.serie.map((item) => {
                      const d1 = item.lote_1
                      const d2 = item.lote_2
                      return (
                        <tr key={item.dia}>
                          <td><strong>Día {item.dia}</strong></td>
                          <td className="mcl-l1">{d1?.peso_promedio_g ? `${d1.peso_promedio_g} g` : '—'}</td>
                          <td className="mcl-l2">{d2?.peso_promedio_g ? `${d2.peso_promedio_g} g` : '—'}</td>
                          <td className="mcl-l1">{d1?.mortalidad_acumulada_pct !== undefined ? `${d1.mortalidad_acumulada_pct}%` : '—'}</td>
                          <td className="mcl-l2">{d2?.mortalidad_acumulada_pct !== undefined ? `${d2.mortalidad_acumulada_pct}%` : '—'}</td>
                          <td className="mcl-l1">{d1?.alimento_acumulado_kg ? `${Math.round(d1.alimento_acumulado_kg)} kg` : '—'}</td>
                          <td className="mcl-l2">{d2?.alimento_acumulado_kg ? `${Math.round(d2.alimento_acumulado_kg)} kg` : '—'}</td>
                          <td className="mcl-l1">{d1?.fcr ? d1.fcr.toFixed(2) : '—'}</td>
                          <td className="mcl-l2">{d2?.fcr ? d2.fcr.toFixed(2) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
