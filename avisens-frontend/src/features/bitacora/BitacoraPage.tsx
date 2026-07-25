// BitacoraPage.tsx — Módulo de Bitácora Productiva (EP-06 HU-26 a HU-29).
// Pestañas visibles por rol según las historias épicas:
//   Operario    → Mortalidad (HU-27) y Consumo (HU-28)
//   Propietario → Registros, Peso (HU-26), Mortalidad, Consumo, + Reporte (HU-29)

import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  REGISTROS_BITACORA,
  REGISTROS_MORTALIDAD,
  REGISTROS_CONSUMO,
  CURVAS_PESO,
  type TipoRegistro,
  type PuntoCurva,
} from './data'
import { GALPONES_MONITOREO } from '../monitoreo/data'
import { getRol } from '@shared/api'
import { IcDoc, IcScale, IcHeart, IcSeed, IcDrop, IcAlert } from '@shared/ui/icons/icons'
import './BitacoraPage.css'

// Galpones con lote activo — los únicos que tiene sentido registrar en bitácora
const GALPONES_ACTIVOS = GALPONES_MONITOREO.filter(g => g.diaVida > 0)

// ─── Gráfica SVG de curva de crecimiento ─────────────────────────────────────
// Real del lote vs. estándar Ross 308. SVG puro — sin librerías externas.
// Diferenciador clave vs. Avi-Smart, AviSoft y Smelpro en Colombia.
function CurvaPesoChart({ datos }: { datos: PuntoCurva[] }) {
  if (!datos.length) return null

  const W = 560; const H = 220
  const padL = 52; const padR = 20; const padT = 20; const padB = 36
  const plotW = W - padL - padR; const plotH = H - padT - padB

  const allPesos = datos.flatMap(d => [d.pesoReal, d.pesoObjetivo])
  const minPeso  = Math.floor(Math.min(...allPesos) * 0.85 / 100) * 100
  const maxPeso  = Math.ceil( Math.max(...allPesos) * 1.08 / 100) * 100

  // Coordenadas SVG a partir de semana y peso
  const xOf = (s: number) => padL + ((s - 1) / (datos.length - 1)) * plotW
  const yOf = (p: number) => padT + plotH - ((p - minPeso) / (maxPeso - minPeso)) * plotH
  const pts  = (k: 'pesoReal' | 'pesoObjetivo') =>
    datos.map(d => `${xOf(d.semana).toFixed(1)},${yOf(d[k]).toFixed(1)}`).join(' ')

  // Polígono de zona de tolerancia ±7%
  const zonaAlerta = [
    ...datos.map(d => `${xOf(d.semana).toFixed(1)},${yOf(d.pesoObjetivo * 1.07).toFixed(1)}`),
    ...datos.slice().reverse().map(d => `${xOf(d.semana).toFixed(1)},${yOf(d.pesoObjetivo * 0.93).toFixed(1)}`),
  ].join(' ')

  // Líneas de cuadrícula
  const gridStep = Math.round((maxPeso - minPeso) / 4 / 100) * 100
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

        {/* Línea objetivo Ross 308 (verde punteada) */}
        <polyline points={pts('pesoObjetivo')} fill="none"
          stroke="#10b981" strokeWidth="2" strokeDasharray="6 3"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Línea real del lote (azul) */}
        <polyline points={pts('pesoReal')} fill="none"
          stroke="#3b82f6" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Puntos del lote */}
        {datos.map(d => {
          const desv  = Math.abs((d.pesoReal - d.pesoObjetivo) / d.pesoObjetivo * 100)
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
          <span className="bit-chart-linea bit-chart-linea--obj" /> Estándar Ross 308
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
  // HU-26 aplica: Registros generales — solo Propietario tiene visión completa del ciclo
  { id: 'registros',  label: 'Todos los registros', icon: <IcDoc   size={14} />, roles: ['Propietario'] },
  // HU-26: Curva de peso semanal — "Como Usuario" = Propietario
  { id: 'peso',       label: 'Curva de peso',       icon: <IcScale size={14} />, roles: ['Propietario'] },
  // HU-27: Mortalidad diaria — "Como Operario" (Propietario también puede consultarla)
  { id: 'mortalidad', label: 'Mortalidad',          icon: <IcHeart size={14} /> },
  // HU-28: Consumo de alimento y agua — "Como Operario"
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

  // Filtra las pestañas según el rol activo:
  // Si una pestaña tiene `roles`, solo la ven esos roles; sin `roles` la ven todos.
  const tabsVisibles = TABS.filter(t => !t.roles || (rol !== null && t.roles.includes(rol)))

  // Pestaña activa — arranca en la primera disponible para el rol
  const [tab, setTab] = useState<TabBitacora>(tabsVisibles[0]?.id ?? 'mortalidad')

  // Galpón seleccionado para filtrar registros
  const [galpon, setGalpon] = useState<string>(GALPONES_ACTIVOS[0]?.codigo ?? 'GP-01')

  // Curva de peso del galpón seleccionado (puede no existir para alguno)
  const curvaSeleccionada = CURVAS_PESO[galpon] ?? []
  const ultimoPunto = curvaSeleccionada[curvaSeleccionada.length - 1]
  const desvUltima  = ultimoPunto
    ? ((ultimoPunto.pesoReal - ultimoPunto.pesoObjetivo) / ultimoPunto.pesoObjetivo) * 100
    : 0

  // Registros filtrados por galpón seleccionado
  const registrosFiltrados = REGISTROS_BITACORA.filter(r => r.galpon === galpon)

  // Subtítulo adaptado al rol
  const subtitulo = rol === 'Operario'
    ? 'Registra la mortalidad y el consumo diario de tu galpón'
    : 'Registro del ciclo: peso, mortalidad, consumo y eventos sanitarios'

  return (
    <div className="page-container bit-page">

      {/* ── Encabezado ──────────────────────────────────────────────────────── */}
      <header className="bit-header">
        <div>
          <h1 className="bit-title">Bitácora Productiva</h1>
          <p className="bit-sub">{subtitulo}</p>
        </div>

        {/* Selector de galpón — generado de los mismos galpones que usa Monitoreo */}
        <select className="bit-select" value={galpon} onChange={e => setGalpon(e.target.value)}>
          {GALPONES_ACTIVOS.map(g => (
            <option key={g.codigo} value={g.codigo}>
              {g.codigo} · {g.nombre} (Día {g.diaVida})
            </option>
          ))}
        </select>
      </header>

      {/* ── Pestañas filtradas por rol ───────────────────────────────────────── */}
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

      {/* ── PESTAÑA: Todos los registros (solo Propietario) ─────────────────── */}
      {tab === 'registros' && (
        <div className="bit-card">
          {registrosFiltrados.length === 0
            ? <p className="bit-vacio">No hay registros para {galpon}.</p>
            : (
              <table className="bit-tabla">
                <thead>
                  <tr>
                    <th>Tipo</th><th>Fecha</th><th>Galpón</th>
                    <th>Valor</th><th>Observación</th><th>Operario</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map(r => (
                    <tr key={r.id}>
                      <td><span className="bit-tipo-badge">{ICONO_TIPO[r.tipo]} {r.tipo}</span></td>
                      <td>{r.fecha}</td>
                      <td>{r.galpon}</td>
                      <td><strong>{r.valor}</strong> {r.unidad}</td>
                      <td className="bit-obs">{r.observacion ?? '—'}</td>
                      <td>{r.operario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      )}

      {/* ── PESTAÑA: Curva de peso — HU-26 (solo Propietario) ───────────────── */}
      {tab === 'peso' && (
        <div className="bit-card">
          {curvaSeleccionada.length === 0 ? (
            <p className="bit-vacio">Todavía no hay pesajes registrados para {galpon}.</p>
          ) : (
            <>
              {/* Resumen de la curva antes de la gráfica */}
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
                  <strong>Ross 308</strong>
                </div>
                <div className="bit-curva-stat">
                  <span>Estado</span>
                  <strong style={{ color: Math.abs(desvUltima) > 7 ? 'var(--red)' : desvUltima < 0 ? 'var(--warning3)' : 'var(--green-d)' }}>
                    {desvUltima >= 0 ? '+' : ''}{desvUltima.toFixed(1)}% {desvUltima < 0 ? 'bajo' : 'sobre'} estándar
                  </strong>
                </div>
              </div>
              {/* Gráfica SVG de curva de peso — diferenciador vs competencia */}
              <CurvaPesoChart datos={curvaSeleccionada} />

              {/* Tabla de datos debajo de la gráfica */}
              <table className="bit-tabla" style={{ marginTop: 0 }}>
                <thead>
                  <tr><th>Semana</th><th>Peso real (g)</th><th>Objetivo Ross 308 (g)</th><th>Desviación</th><th>Muestra</th></tr>
                </thead>
                <tbody>
                  {curvaSeleccionada.map((p: PuntoCurva) => {
                    const desv    = (((p.pesoReal - p.pesoObjetivo) / p.pesoObjetivo) * 100).toFixed(1)
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

      {/* ── PESTAÑA: Mortalidad — HU-27 (Operario y Propietario) ─────────────── */}
      {tab === 'mortalidad' && (
        <div className="bit-card">
          <p className="bit-card-desc">
            Registro diario de mortalidad. Alerta si supera 0.5% del lote por día o 3% acumulado.
          </p>
          <table className="bit-tabla">
            <thead>
              <tr>
                <th>Fecha</th><th>Galpón</th><th>Aves</th>
                <th>Causa probable</th><th>Operario</th>
              </tr>
            </thead>
            <tbody>
              {REGISTROS_MORTALIDAD.filter(r => r.galpon === galpon).map(r => (
                <tr key={r.id}>
                  <td>{r.fecha}</td>
                  <td>{r.galpon}</td>
                  <td><strong>{r.cantidadAves}</strong> aves</td>
                  <td>{r.causaProbable}</td>
                  <td>{r.operario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PESTAÑA: Consumo — HU-28 (Operario y Propietario) ───────────────── */}
      {tab === 'consumo' && (
        <div className="bit-card">
          <p className="bit-card-desc">
            Consumo diario de alimento y agua. Relación ideal: ~2 litros de agua por kg de alimento.
          </p>
          <table className="bit-tabla">
            <thead>
              <tr>
                <th>Fecha</th><th>Galpón</th><th>Alimento (kg)</th>
                <th>Agua (L)</th><th>g/ave</th><th>Rel. A/A</th>
              </tr>
            </thead>
            <tbody>
              {REGISTROS_CONSUMO.filter(r => r.galpon === galpon).map(r => (
                <tr key={r.id}>
                  <td>{r.fecha}</td>
                  <td>{r.galpon}</td>
                  <td><strong>{r.alimentoKg.toLocaleString()}</strong></td>
                  <td>{r.aguaLitros.toLocaleString()}</td>
                  <td>{r.consumoPorAve}</td>
                  <td>{r.relacionAguaAlimento.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default BitacoraPage
