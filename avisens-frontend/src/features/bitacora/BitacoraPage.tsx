// BitacoraPage.tsx — Módulo de Bitácora Productiva (EP-06 HU-26 a HU-29).
// Pestañas visibles por rol según las historias épicas:
//   Operario    → Mortalidad (HU-27) y Consumo (HU-28)
//   Propietario → Registros, Peso (HU-26), Mortalidad, Consumo, + Reporte (HU-29)
//
// Consume /galpones, /lotes, /pesajes, /registros-mortalidad, /consumos-diarios,
// /eventos-sanitarios y /curvas-objetivo. El backend no filtra estas listas por
// lote (solo pagina), así que se piden con un límite alto y se filtran aquí por
// el lote activo del galpón seleccionado.

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { isAxiosError } from 'axios'
import {
  listarGalpones,
  listarLotes,
  listarPesajes,
  listarRegistrosMortalidad,
  listarConsumosDiarios,
  listarEventosSanitarios,
  listarCurvasObjetivo,
  getRol,
  type Galpon,
  type Lote,
  type Pesaje,
  type RegistroMortalidad,
  type ConsumoDiario,
  type EventoSanitario,
  type CurvaObjetivo,
} from '@shared/api'
import { IcDoc, IcScale, IcHeart, IcSeed, IcDrop, IcAlert } from '@shared/ui/icons/icons'
import './BitacoraPage.css'

// Límite generoso: no hay filtro por lote en el backend, así que se trae un
// lote de registros grande y se filtra aquí. Suficiente para un ciclo de
// engorde (~42 días) de varios lotes.
const LIMITE_REGISTROS = 200

type TipoRegistro = 'peso' | 'mortalidad' | 'consumo' | 'sanitario'

// Punto de la curva de crecimiento: peso real de un pesaje vs. el objetivo de
// la curva de referencia (marca de alimento + sexo del lote) para ese día.
type PuntoCurva = {
  semana: number
  pesoReal: number
  pesoObjetivo: number
  muestraAves: number
}

// Fila unificada para la pestaña "Todos los registros"
type FilaRegistro = {
  id: string
  tipo: TipoRegistro
  fecha: string
  valor: number
  unidad: string
  observacion: string | null
  metodo: string | null
}

function diasEntre(desdeISO: string, hastaISO: string): number {
  const dias = Math.floor(
    (new Date(hastaISO).getTime() - new Date(desdeISO).getTime()) / 86_400_000,
  )
  return Math.max(dias, 0)
}

// ─── Gráfica SVG de curva de crecimiento ─────────────────────────────────────
// Real del lote vs. curva de referencia (curvas-objetivo). SVG puro — sin librerías externas.
function CurvaPesoChart({ datos }: { datos: PuntoCurva[] }) {
  if (!datos.length) return null

  const W = 560; const H = 220
  const padL = 52; const padR = 20; const padT = 20; const padB = 36
  const plotW = W - padL - padR; const plotH = H - padT - padB

  const allPesos = datos.flatMap(d => [d.pesoReal, d.pesoObjetivo])
  const minPeso  = Math.floor(Math.min(...allPesos) * 0.85 / 100) * 100
  const maxPeso  = Math.ceil( Math.max(...allPesos) * 1.08 / 100) * 100

  // Coordenadas SVG a partir de semana y peso
  const xOf = (s: number) => padL + ((s - datos[0].semana) / (Math.max(datos.length - 1, 1))) * plotW
  const yOf = (p: number) => padT + plotH - ((p - minPeso) / (maxPeso - minPeso || 1)) * plotH
  const pts  = (k: 'pesoReal' | 'pesoObjetivo') =>
    datos.map(d => `${xOf(d.semana).toFixed(1)},${yOf(d[k]).toFixed(1)}`).join(' ')

  // Polígono de zona de tolerancia ±7%
  const zonaAlerta = [
    ...datos.map(d => `${xOf(d.semana).toFixed(1)},${yOf(d.pesoObjetivo * 1.07).toFixed(1)}`),
    ...datos.slice().reverse().map(d => `${xOf(d.semana).toFixed(1)},${yOf(d.pesoObjetivo * 0.93).toFixed(1)}`),
  ].join(' ')

  // Líneas de cuadrícula
  const gridStep = Math.max(Math.round((maxPeso - minPeso) / 4 / 100) * 100, 100)
  const gridLines = []
  for (let v = minPeso; v <= maxPeso; v += gridStep) {
    gridLines.push({ y: yOf(v), label: (v / 1000).toFixed(1) + ' kg' })
  }

  return (
    <div className="bit-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="grad-real-bit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Zona óptima ±7% */}
        <polygon points={zonaAlerta} fill="rgba(16,185,129,0.08)" />

        {/* Cuadrícula */}
        {gridLines.map(({ y, label }) => (
          <g key={label}>
            <line x1={padL} y1={y.toFixed(1)} x2={W - padR} y2={y.toFixed(1)}
              stroke="rgba(10,26,20,0.07)" strokeWidth="1" strokeDasharray="4 3" />
            <text x={padL - 6} y={y.toFixed(1)} textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="rgba(10,26,20,0.4)" fontFamily="DM Mono,monospace">
              {label}
            </text>
          </g>
        ))}

        {/* Etiquetas eje X */}
        {datos.map(d => (
          <text key={d.semana} x={xOf(d.semana).toFixed(1)} y={H - 8}
            textAnchor="middle" fontSize="9.5" fill="rgba(10,26,20,0.45)" fontFamily="Inter,sans-serif">
            S{d.semana}
          </text>
        ))}

        {/* Área rellena bajo línea real */}
        <polygon
          points={`${pts('pesoReal')} ${xOf(datos[datos.length - 1].semana).toFixed(1)},${(padT+plotH).toFixed(1)} ${padL},${(padT+plotH).toFixed(1)}`}
          fill="url(#grad-real-bit)"
        />

        {/* Línea objetivo (verde punteada) */}
        <polyline points={pts('pesoObjetivo')} fill="none"
          stroke="#10b981" strokeWidth="2" strokeDasharray="6 3"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Línea real del lote (azul) */}
        <polyline points={pts('pesoReal')} fill="none"
          stroke="#3b82f6" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Puntos del lote */}
        {datos.map(d => {
          const desv  = d.pesoObjetivo > 0 ? Math.abs((d.pesoReal - d.pesoObjetivo) / d.pesoObjetivo * 100) : 0
          const color = desv > 7 ? '#ef4444' : '#3b82f6'
          return (
            <g key={d.semana}>
              <circle cx={xOf(d.semana).toFixed(1)} cy={yOf(d.pesoReal).toFixed(1)}
                r="5" fill="white" stroke={color} strokeWidth="2.5" />
              <text x={xOf(d.semana).toFixed(1)} y={(yOf(d.pesoReal) - 9).toFixed(1)}
                textAnchor="middle" fontSize="9" fill={color}
                fontFamily="DM Mono,monospace" fontWeight="700">
                {d.pesoReal.toLocaleString()}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Leyenda */}
      <div className="bit-chart-leyenda">
        <span className="bit-chart-item">
          <span className="bit-chart-linea bit-chart-linea--real" /> Peso real del lote
        </span>
        <span className="bit-chart-item">
          <span className="bit-chart-linea bit-chart-linea--obj" /> Curva de referencia
        </span>
        <span className="bit-chart-item">
          <span className="bit-chart-zona" /> Zona óptima (±7%)
        </span>
      </div>
    </div>
  )
}

// Todas las pestañas posibles del módulo
type TabBitacora = 'registros' | 'peso' | 'mortalidad' | 'consumo'

// Definición de cada pestaña con su ícono, label y los roles que pueden verla
// (sin campo 'roles' = todos los roles)
const TABS: { id: TabBitacora; label: string; icon: ReactNode; roles?: string[] }[] = [
  { id: 'registros',  label: 'Todos los registros', icon: <IcDoc   size={14} />, roles: ['Propietario'] },
  { id: 'peso',       label: 'Curva de peso',       icon: <IcScale size={14} />, roles: ['Propietario'] },
  { id: 'mortalidad', label: 'Mortalidad',          icon: <IcHeart size={14} /> },
  { id: 'consumo',    label: 'Consumo',             icon: <IcSeed  size={14} /> },
]

// Ícono por tipo de registro para la tabla general
const ICONO_TIPO: Record<TipoRegistro, ReactNode> = {
  peso:       <IcScale size={13} />,
  mortalidad: <IcHeart size={13} />,
  consumo:    <IcSeed  size={13} />,
  sanitario:  <IcDrop  size={13} />,
}

// ─── Componente principal ─────────────────────────────────────────────────────
function BitacoraPage() {
  const rol = getRol()

  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [pesajes, setPesajes] = useState<Pesaje[]>([])
  const [mortalidad, setMortalidad] = useState<RegistroMortalidad[]>([])
  const [consumos, setConsumos] = useState<ConsumoDiario[]>([])
  const [sanitarios, setSanitarios] = useState<EventoSanitario[]>([])
  const [curvas, setCurvas] = useState<CurvaObjetivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  // Galpón seleccionado para filtrar registros (id de galpón, no de lote)
  const [galponId, setGalponId] = useState<number | null>(null)

  useEffect(() => {
    let activo = true

    async function cargar() {
      try {
        const [galponesData, lotesData, pesajesData, mortalidadData, consumosData, sanitariosData] =
          await Promise.all([
            listarGalpones(),
            listarLotes(),
            listarPesajes(1, LIMITE_REGISTROS),
            listarRegistrosMortalidad(1, LIMITE_REGISTROS),
            listarConsumosDiarios(1, LIMITE_REGISTROS),
            listarEventosSanitarios(1, LIMITE_REGISTROS),
          ])
        if (!activo) return
        setGalpones(galponesData)
        setLotes(lotesData)
        setPesajes(pesajesData)
        setMortalidad(mortalidadData)
        setConsumos(consumosData)
        setSanitarios(sanitariosData)
        setError('')
      } catch (err) {
        if (!activo) return
        setError(
          isAxiosError(err) && err.response?.status === 403
            ? 'No tienes permisos para ver la bitácora.'
            : 'No se pudo cargar la bitácora.',
        )
      } finally {
        if (activo) setCargando(false)
      }
    }

    cargar()
    return () => { activo = false }
  }, [])

  // Galpones con un lote activo — los únicos que tiene sentido registrar
  const galponesActivos = useMemo(
    () => galpones
      .map(g => ({ galpon: g, lote: lotes.find(l => l.galpon.id === g.id && l.estado === 'activo') ?? null }))
      .filter((x): x is { galpon: Galpon; lote: Lote } => x.lote !== null),
    [galpones, lotes],
  )

  // Filtra las pestañas según el rol activo
  const tabsVisibles = TABS.filter(t => !t.roles || (rol !== null && t.roles.includes(rol)))
  const [tab, setTab] = useState<TabBitacora>(tabsVisibles[0]?.id ?? 'mortalidad')

  // Selecciona el primer galpón activo por defecto en cuanto llegan los datos
  useEffect(() => {
    if (galponId === null && galponesActivos.length > 0) {
      setGalponId(galponesActivos[0].galpon.id)
    }
  }, [galponId, galponesActivos])

  // Fetch curvas de referencia cuando cambia el lote seleccionado (necesita marca + sexo del lote)
  const loteSeleccionado = galponesActivos.find(x => x.galpon.id === galponId)?.lote ?? null

  useEffect(() => {
    let activo = true
    if (!loteSeleccionado?.marca_alimento || !loteSeleccionado.sexo) {
      setCurvas([])
      return
    }
    listarCurvasObjetivo({ marca: loteSeleccionado.marca_alimento, sexo: loteSeleccionado.sexo })
      .then(data => { if (activo) setCurvas(data) })
      .catch(() => { if (activo) setCurvas([]) })
    return () => { activo = false }
  }, [loteSeleccionado?.marca_alimento, loteSeleccionado?.sexo])

  const loteId = loteSeleccionado?.id ?? null

  // Registros del lote seleccionado, por tipo
  const pesajesLote     = useMemo(() => pesajes.filter(p => p.lote_id === loteId), [pesajes, loteId])
  const mortalidadLote  = useMemo(() => mortalidad.filter(m => m.lote_id === loteId), [mortalidad, loteId])
  const consumosLote    = useMemo(() => consumos.filter(c => c.lote_id === loteId), [consumos, loteId])
  const sanitariosLote  = useMemo(() => sanitarios.filter(s => s.lote_id === loteId), [sanitarios, loteId])

  // Curva de peso real vs. objetivo: 1 punto por semana (el pesaje más reciente de esa semana)
  const curvaSeleccionada = useMemo((): PuntoCurva[] => {
    if (!loteSeleccionado) return []
    const porSemana = new Map<number, Pesaje>()
    for (const p of pesajesLote) {
      const diaVida = diasEntre(loteSeleccionado.fecha_ingreso, p.fecha)
      const semana = Math.floor(diaVida / 7) + 1
      const actual = porSemana.get(semana)
      if (!actual || new Date(p.fecha) > new Date(actual.fecha)) porSemana.set(semana, p)
    }
    return [...porSemana.entries()]
      .sort(([a], [b]) => a - b)
      .map(([semana, p]) => {
        const diaVida = diasEntre(loteSeleccionado.fecha_ingreso, p.fecha)
        const curvaDia = curvas.find(c => c.dia === diaVida)
        const pesoObjetivo = p.peso_objetivo_g ?? curvaDia?.peso_esperado_g ?? p.peso_promedio_g
        return {
          semana,
          pesoReal: p.peso_promedio_g,
          pesoObjetivo,
          muestraAves: p.cantidad_aves_pesadas ?? 0,
        }
      })
  }, [pesajesLote, curvas, loteSeleccionado])

  const ultimoPunto = curvaSeleccionada[curvaSeleccionada.length - 1]
  const desvUltima  = ultimoPunto && ultimoPunto.pesoObjetivo > 0
    ? ((ultimoPunto.pesoReal - ultimoPunto.pesoObjetivo) / ultimoPunto.pesoObjetivo) * 100
    : 0

  // Registros mezclados para la pestaña "Todos los registros"
  const registrosFiltrados = useMemo((): FilaRegistro[] => {
    const filas: FilaRegistro[] = [
      ...pesajesLote.map(p => ({
        id: `peso-${p.id}`, tipo: 'peso' as const, fecha: p.fecha,
        valor: p.peso_promedio_g, unidad: 'g/ave',
        observacion: p.observaciones, metodo: p.metodo_registro,
      })),
      ...mortalidadLote.map(m => ({
        id: `mort-${m.id}`, tipo: 'mortalidad' as const, fecha: m.fecha,
        valor: m.cantidad_aves, unidad: 'aves',
        observacion: m.causa_presuntiva ?? m.observaciones, metodo: m.metodo_registro,
      })),
      ...consumosLote.map(c => ({
        id: `cons-${c.id}`, tipo: 'consumo' as const, fecha: c.fecha,
        valor: c.alimento_kg ?? 0, unidad: 'kg',
        observacion: null, metodo: c.metodo_registro,
      })),
      ...sanitariosLote.map(s => ({
        id: `san-${s.id}`, tipo: 'sanitario' as const, fecha: s.fecha,
        valor: s.cantidad_aves ?? 1, unidad: 'evento',
        observacion: s.diagnostico ?? s.producto, metodo: s.metodo_registro,
      })),
    ]
    return filas.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
  }, [pesajesLote, mortalidadLote, consumosLote, sanitariosLote])

  // Subtítulo adaptado al rol
  const subtitulo = rol === 'Operario'
    ? 'Registra la mortalidad y el consumo diario de tu galpón'
    : 'Registro del ciclo: peso, mortalidad, consumo y eventos sanitarios'

  if (cargando) {
    return (
      <div className="page-container bit-page">
        <p className="bit-vacio">Cargando bitácora…</p>
      </div>
    )
  }

  return (
    <div className="page-container bit-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="bit-header">
        <div>
          <h1 className="bit-title">Bitácora Productiva</h1>
          <p className="bit-sub">{subtitulo}</p>
        </div>

        {/* Selector de galpón — solo los que tienen un lote activo */}
        {galponesActivos.length > 0 && (
          <select
            className="bit-select"
            value={galponId ?? ''}
            onChange={e => setGalponId(Number(e.target.value))}
          >
            {galponesActivos.map(({ galpon, lote }) => (
              <option key={galpon.id} value={galpon.id}>
                {galpon.codigo} · {galpon.nombre} (Día {diasEntre(lote.fecha_ingreso, new Date().toISOString())})
              </option>
            ))}
          </select>
        )}
      </header>

      {error && <div className="bit-alert" role="alert">{error}</div>}

      {galponesActivos.length === 0 ? (
        <div className="bit-card">
          <p className="bit-vacio">No hay galpones con un lote activo todavía.</p>
        </div>
      ) : (
        <>
          {/* ── Pestañas filtradas por rol ───────────────────────────────────── */}
          <div className="bit-tabs">
            {tabsVisibles.map(({ id, label, icon }) => (
              <button
                key={id}
                className={`bit-tab${tab === id ? ' bit-tab--activo' : ''}`}
                onClick={() => setTab(id)}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* ── PESTAÑA: Todos los registros (solo Propietario) ─────────────── */}
          {tab === 'registros' && (
            <div className="bit-card">
              {registrosFiltrados.length === 0
                ? <p className="bit-vacio">No hay registros para este galpón.</p>
                : (
                  <table className="bit-tabla">
                    <thead>
                      <tr>
                        <th>Tipo</th><th>Fecha</th>
                        <th>Valor</th><th>Observación</th><th>Método</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosFiltrados.map(r => (
                        <tr key={r.id}>
                          <td><span className="bit-tipo-badge">{ICONO_TIPO[r.tipo]} {r.tipo}</span></td>
                          <td>{r.fecha}</td>
                          <td><strong>{r.valor}</strong> {r.unidad}</td>
                          <td className="bit-obs">{r.observacion ?? '—'}</td>
                          <td>{r.metodo ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {/* ── PESTAÑA: Curva de peso — HU-26 (solo Propietario) ────────────── */}
          {tab === 'peso' && (
            <div className="bit-card">
              {curvaSeleccionada.length === 0 ? (
                <p className="bit-vacio">Todavía no hay pesajes registrados para este galpón.</p>
              ) : (
                <>
                  <div className="bit-curva-resumen">
                    <div className="bit-curva-stat">
                      <span>Último peso</span>
                      <strong>{ultimoPunto?.pesoReal.toLocaleString() ?? '—'} g</strong>
                    </div>
                    <div className="bit-curva-stat">
                      <span>Objetivo S{ultimoPunto?.semana}</span>
                      <strong>{ultimoPunto?.pesoObjetivo.toLocaleString() ?? '—'} g</strong>
                    </div>
                    <div className="bit-curva-stat">
                      <span>Curva usada</span>
                      <strong>{loteSeleccionado?.marca_alimento ?? '—'}</strong>
                    </div>
                    <div className="bit-curva-stat">
                      <span>Estado</span>
                      <strong style={{ color: Math.abs(desvUltima) > 7 ? 'var(--red)' : desvUltima < 0 ? 'var(--warning3)' : 'var(--green-d)' }}>
                        {desvUltima >= 0 ? '+' : ''}{desvUltima.toFixed(1)}% {desvUltima < 0 ? 'bajo' : 'sobre'} objetivo
                      </strong>
                    </div>
                  </div>
                  <CurvaPesoChart datos={curvaSeleccionada} />

                  <table className="bit-tabla" style={{ marginTop: 0 }}>
                    <thead>
                      <tr><th>Semana</th><th>Peso real (g)</th><th>Objetivo (g)</th><th>Desviación</th><th>Muestra</th></tr>
                    </thead>
                    <tbody>
                      {curvaSeleccionada.map((p) => {
                        const desv    = p.pesoObjetivo > 0 ? (((p.pesoReal - p.pesoObjetivo) / p.pesoObjetivo) * 100).toFixed(1) : '0.0'
                        const critico = Math.abs(Number(desv)) > 7
                        return (
                          <tr key={p.semana} className={critico ? 'bit-fila-alerta' : ''}>
                            <td>Semana {p.semana}</td>
                            <td><strong>{p.pesoReal.toLocaleString()}</strong></td>
                            <td>{p.pesoObjetivo.toLocaleString()}</td>
                            <td>
                              <span className={`bit-desv ${Number(desv) < 0 ? 'bit-desv--neg' : 'bit-desv--pos'}`}>
                                {Number(desv) >= 0 ? '+' : ''}{desv}% {critico && <IcAlert size={12} />}
                              </span>
                            </td>
                            <td>{p.muestraAves} aves</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}

          {/* ── PESTAÑA: Mortalidad — HU-27 (Operario y Propietario) ─────────── */}
          {tab === 'mortalidad' && (
            <div className="bit-card">
              <p className="bit-card-desc">
                Registro diario de mortalidad. Alerta si supera 0.5% del lote por día o 3% acumulado.
              </p>
              {mortalidadLote.length === 0 ? (
                <p className="bit-vacio">No hay registros de mortalidad para este galpón.</p>
              ) : (
                <table className="bit-tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Aves</th>
                      <th>Causa probable</th><th>Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mortalidadLote.map(r => (
                      <tr key={r.id}>
                        <td>{r.fecha}</td>
                        <td><strong>{r.cantidad_aves}</strong> aves</td>
                        <td>{r.causa_presuntiva ?? '—'}</td>
                        <td>{r.metodo_registro ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── PESTAÑA: Consumo — HU-28 (Operario y Propietario) ────────────── */}
          {tab === 'consumo' && (
            <div className="bit-card">
              <p className="bit-card-desc">
                Consumo diario de alimento y agua. Relación ideal: ~2 litros de agua por kg de alimento.
              </p>
              {consumosLote.length === 0 ? (
                <p className="bit-vacio">No hay registros de consumo para este galpón.</p>
              ) : (
                <table className="bit-tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th><th>Alimento (kg)</th>
                      <th>Agua (L)</th><th>g/ave</th><th>Rel. A/A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumosLote.map(r => {
                      const aves = loteSeleccionado?.cantidad_inicial ?? 0
                      const consumoPorAve = aves > 0 && r.alimento_kg ? (r.alimento_kg * 1000) / aves : 0
                      const relacionAA = r.alimento_kg ? (r.agua_litros ?? 0) / r.alimento_kg : 0
                      return (
                        <tr key={r.id}>
                          <td>{r.fecha}</td>
                          <td><strong>{(r.alimento_kg ?? 0).toLocaleString()}</strong></td>
                          <td>{(r.agua_litros ?? 0).toLocaleString()}</td>
                          <td>{consumoPorAve.toFixed(1)}</td>
                          <td>{relacionAA.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default BitacoraPage
