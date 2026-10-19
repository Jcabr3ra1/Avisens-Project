// LecturasEnVivo.tsx — Lecturas que llegan del ESP32 (→ /ingest → BD) para los
// sensores del galpón seleccionado: una gráfica por sensor con las últimas
// lecturas y una tabla con las más recientes. Consulta /mediciones cada 5 s,
// independiente del cache de 30 s de useMonitoreoAmbiental.

import { useEffect, useRef, useState } from 'react'
import { listarMediciones, type Medicion } from '@features/sensores/api/mediciones'
import { iconoSensor } from '@shared/ui/sensorIcon'
import {
  AYUDA_SALIDA_REPORTADA,
  estaEncendido,
  formatearUltimaLectura,
  textoSalidaReportada,
  textoValor,
  type SensorVista,
} from './hooks/useMonitoreoAmbiental'

const INTERVALO_MS = 5000
const LECTURAS_POR_SENSOR = 30
const FILAS_TABLA = 16
// Tope de /mediciones por página. Con 9 sensores cada 5 s alcanza para ~50 s
// de lecturas: de sobra entre un refresco y el siguiente.
const LIMITE_REFRESCO = 100

type Props = {
  sensores: SensorVista[]
  // Se llama cuando llega una lectura más nueva que la última vista, para que
  // las tarjetas de arriba no esperen al siguiente ciclo de su cache.
  onNuevaLectura?: () => void
}

function hora(fechaISO: string): string {
  return new Date(fechaISO).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function redondear(v: number): number {
  return Math.round(v * 10) / 10
}

export function LecturasEnVivo({ sensores, onNuevaLectura }: Props) {
  const [porSensor, setPorSensor] = useState<Record<number, Medicion[]>>({})
  const [enVivo, setEnVivo] = useState(true)
  const [error, setError] = useState('')
  const [, setTic] = useState(0)
  const ultimaVista = useRef<number>(0)
  const avisar = useRef(onNuevaLectura)
  avisar.current = onNuevaLectura

  const ids = sensores.map(s => s.id).join(',')

  useEffect(() => {
    // Al cambiar de galpón se descarta lo del anterior.
    setPorSensor({})
    ultimaVista.current = 0
  }, [ids])

  useEffect(() => {
    if (!enVivo || ids === '') return
    let activo = true
    const lista = ids.split(',').map(Number)
    const delGalpon = new Set(lista)

    // Une lecturas nuevas a las que ya hay por sensor, sin repetir, y deja
    // las LECTURAS_POR_SENSOR más recientes de cada uno.
    function aplicar(nuevas: Medicion[]) {
      let masNueva = 0
      for (const m of nuevas) masNueva = Math.max(masNueva, new Date(m.fecha_hora).getTime())
      setPorSensor(prev => {
        const siguiente: Record<number, Medicion[]> = { ...prev }
        for (const id of lista) {
          const vistos = new Set((prev[id] ?? []).map(m => m.id))
          const agregadas = nuevas.filter(m => m.sensor_id === id && !vistos.has(m.id))
          if (agregadas.length === 0 && prev[id]) continue
          siguiente[id] = [...agregadas, ...(prev[id] ?? [])]
            .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
            .slice(0, LECTURAS_POR_SENSOR)
        }
        return siguiente
      })
      if (ultimaVista.current !== 0 && masNueva > ultimaVista.current) avisar.current?.()
      ultimaVista.current = Math.max(ultimaVista.current, masNueva)
    }

    // Historial inicial: una petición por sensor, solo al entrar o reanudar.
    // Pedirlas así cada 5 s superaba el límite del backend (100/min) con
    // nueve sensores y las lecturas dejaban de cargar.
    async function cargarHistorial() {
      const resultados = await Promise.allSettled(
        lista.map(id => listarMediciones({ sensor_id: id, page: 1, limit: LECTURAS_POR_SENSOR })),
      )
      if (!activo) return
      const ok = resultados.flatMap(r => (r.status === 'fulfilled' ? r.value : []))
      aplicar(ok)
      setError(resultados.some(r => r.status === 'rejected') ? 'No se pudieron cargar todas las lecturas en vivo.' : '')
    }

    // Refresco: una sola petición con lo más reciente de todos los sensores.
    async function refrescar() {
      try {
        const recientes = await listarMediciones({ page: 1, limit: LIMITE_REFRESCO })
        if (!activo) return
        aplicar(recientes.filter(m => delGalpon.has(m.sensor_id)))
        setError('')
      } catch {
        if (activo) setError('No se pudieron cargar las lecturas en vivo.')
      }
    }

    void cargarHistorial()
    const timer = setInterval(() => { void refrescar() }, INTERVALO_MS)
    return () => { activo = false; clearInterval(timer) }
  }, [enVivo, ids])

  // Refresca los "hace Xs" aunque no lleguen datos nuevos.
  useEffect(() => {
    const timer = setInterval(() => setTic(t => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const filas = sensores
    .flatMap(s => (porSensor[s.id] ?? []).map(m => ({ m, s })))
    .sort((a, b) => new Date(b.m.fecha_hora).getTime() - new Date(a.m.fecha_hora).getTime())
    .slice(0, FILAS_TABLA)

  const ultimaTs = filas[0] ? new Date(filas[0].m.fecha_hora).getTime() : null

  return (
    <section className="mon-section mon-vivo">
      <div className="mon-vivo-head">
        <div>
          <h2 className="mon-section-title">
            <span className={`mon-vivo-dot${enVivo ? ' mon-vivo-dot--on' : ''}`} />
            Lecturas en vivo
          </h2>
          <p className="mon-section-sub">
            {enVivo ? 'Se actualiza cada 5 s' : 'En pausa'} · Última lectura: {formatearUltimaLectura(ultimaTs)}
          </p>
        </div>
        <button type="button" className="mon-vivo-btn" onClick={() => setEnVivo(v => !v)}>
          {enVivo ? 'Pausar' : 'Reanudar'}
        </button>
      </div>

      {error && <div className="mon-alert adm-alerta" role="alert">{error}</div>}

      <div className="mon-vivo-graficas">
        {sensores.map(s => s.esEstado
          ? <GraficaEstado key={s.id} sensor={s} mediciones={porSensor[s.id] ?? []} />
          : <GraficaSensor key={s.id} sensor={s} mediciones={porSensor[s.id] ?? []} />,
        )}
      </div>

      <div className="mon-tabla-card adm-panel">
        <div className="mon-tabla-head mon-tabla--vivo">
          <span>Hora</span><span>ID</span><span>Sensor</span><span>Valor</span>
        </div>
        {filas.length === 0 ? (
          <div className="mon-tabla-row mon-tabla-vacia">Todavía no hay lecturas de estos sensores.</div>
        ) : filas.map(({ m, s }) => (
          <div key={m.id} className="mon-tabla-row mon-tabla--vivo">
            <span className="mon-tabla-ultima">{hora(m.fecha_hora)}</span>
            <span className="mon-tabla-id">#{s.id}</span>
            <span className="mon-tabla-sensor">
              <span>{iconoSensor(s.tipo, 14)} {s.tipo}</span>
              <small>{s.codigo}</small>
            </span>
            <span><strong>{textoValor(s, m.valor)}</strong></span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Motor: franja de encendido/apagado en orden cronológico ─────────────────
function GraficaEstado({ sensor, mediciones }: { sensor: SensorVista; mediciones: Medicion[] }) {
  const datos = [...mediciones].reverse()
  const actual = datos[datos.length - 1]
  const encendidas = datos.filter(d => estaEncendido(d.valor)).length
  const ultimoEncendido = [...datos].reverse().find(d => estaEncendido(d.valor))
  const on = actual ? estaEncendido(actual.valor) : false

  return (
    <div className="mon-vivo-card adm-panel">
      <div className="mon-vivo-card-head">
        <div className="mon-sensor-icon">{iconoSensor(sensor.tipo, 18)}</div>
        <div className="mon-sensor-info">
          <span className="mon-sensor-nombre">{sensor.tipo}</span>
          <span className="mon-sensor-zona">ID #{sensor.id} · {sensor.codigo}</span>
        </div>
        <div className="mon-sensor-valor">
          {actual
            ? <strong className={`mon-onoff mon-onoff--${on ? 'on' : 'off'}`} title={AYUDA_SALIDA_REPORTADA}>{textoSalidaReportada(on)}</strong>
            : <span className="mon-offline-txt">—</span>}
        </div>
      </div>

      {datos.length === 0 ? (
        <p className="mon-vivo-vacio">Sin lecturas todavía.</p>
      ) : (
        <>
          <div className="mon-vivo-franja" role="img"
            aria-label={`${sensor.tipo}: salida encendida en ${encendidas} de ${datos.length} lecturas`}>
            {datos.map(d => (
              <span key={d.id}
                className={`mon-vivo-tramo${estaEncendido(d.valor) ? ' mon-vivo-tramo--on' : ''}`}
                title={`${textoSalidaReportada(estaEncendido(d.valor))} · ${hora(d.fecha_hora)}`} />
            ))}
          </div>
          <div className="mon-vivo-eje">
            <span>{hora(datos[0].fecha_hora)}</span>
            <span>{hora(datos[datos.length - 1].fecha_hora)}</span>
          </div>
          <div className="mon-vivo-stats">
            <span>Salida encendida en <strong>{encendidas}</strong> de {datos.length} lecturas</span>
            <span>Última salida encendida: <strong>{ultimoEncendido ? hora(ultimoEncendido.fecha_hora) : '—'}</strong></span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Gráfica de un sensor: últimas lecturas en orden cronológico ─────────────
function GraficaSensor({ sensor, mediciones }: { sensor: SensorVista; mediciones: Medicion[] }) {
  const W = 320; const H = 120
  const PAD_X = 4; const PAD_Y = 10

  // /mediciones llega de la más nueva a la más vieja; la gráfica va al revés.
  const datos = [...mediciones].reverse()
  const valores = datos.map(d => d.valor)
  const min = valores.length ? Math.min(...valores) : 0
  const max = valores.length ? Math.max(...valores) : 0
  const promedio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
  // Margen para que una serie plana no quede pegada al borde.
  const margen = Math.max((max - min) * 0.15, 0.5)
  const yMin = min - margen; const yMax = max + margen

  const x = (i: number) => datos.length > 1 ? PAD_X + (i / (datos.length - 1)) * (W - PAD_X * 2) : W / 2
  const y = (v: number) => H - PAD_Y - ((v - yMin) / (yMax - yMin)) * (H - PAD_Y * 2)
  const puntos = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`).join(' ')
  const actual = datos[datos.length - 1]

  return (
    <div className="mon-vivo-card adm-panel">
      <div className="mon-vivo-card-head">
        <div className="mon-sensor-icon">{iconoSensor(sensor.tipo, 18)}</div>
        <div className="mon-sensor-info">
          <span className="mon-sensor-nombre">{sensor.tipo}</span>
          <span className="mon-sensor-zona">ID #{sensor.id} · {sensor.codigo}</span>
        </div>
        <div className="mon-sensor-valor">
          {actual ? <><strong>{actual.valor}</strong><small>{sensor.unidad}</small></> : <span className="mon-offline-txt">—</span>}
        </div>
      </div>

      {datos.length === 0 ? (
        <p className="mon-vivo-vacio">Sin lecturas todavía.</p>
      ) : (
        <>
          <svg className="mon-vivo-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
            aria-label={`Últimas ${datos.length} lecturas de ${sensor.tipo}`}>
            <line x1="0" x2={W} y1={y(max)} y2={y(max)} className="mon-vivo-guia" />
            <line x1="0" x2={W} y1={y(min)} y2={y(min)} className="mon-vivo-guia" />
            <polyline points={puntos} className="mon-vivo-linea" />
            {datos.map((d, i) => (
              <circle key={d.id} cx={x(i)} cy={y(d.valor)} r={i === datos.length - 1 ? 3.5 : 1.8} className="mon-vivo-punto">
                <title>{`${d.valor} ${sensor.unidad} · ${hora(d.fecha_hora)}`}</title>
              </circle>
            ))}
          </svg>
          <div className="mon-vivo-eje">
            <span>{hora(datos[0].fecha_hora)}</span>
            <span>{hora(datos[datos.length - 1].fecha_hora)}</span>
          </div>
          <div className="mon-vivo-stats">
            <span>Mín. <strong>{redondear(min)}</strong></span>
            <span>Prom. <strong>{redondear(promedio)}</strong></span>
            <span>Máx. <strong>{redondear(max)}</strong></span>
            <span>{datos.length} lecturas</span>
          </div>
        </>
      )}
    </div>
  )
}
