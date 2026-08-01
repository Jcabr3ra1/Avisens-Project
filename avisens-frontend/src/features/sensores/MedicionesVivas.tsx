import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { listarMediciones, type Medicion, type Sensor } from '@shared/api'

// Cada cuánto refresca las lecturas desde el backend (el ESP32 reporta ~cada 5s).
const INTERVALO_MS = 5000

// Tiempo relativo simple: "hace 3s", "hace 2 min", "hace 1 h".
function hace(fechaISO: string): string {
  const seg = Math.max(0, Math.floor((Date.now() - new Date(fechaISO).getTime()) / 1000))
  if (seg < 60) return `hace ${seg}s`
  const min = Math.floor(seg / 60)
  if (min < 60) return `hace ${min} min`
  return `hace ${Math.floor(min / 60)} h`
}

// Muestra las últimas mediciones que llegan al backend (ESP32 → /ingest → BD),
// refrescando en vivo. Recibe la lista de sensores para traducir sensor_id al
// código/tipo/unidad legible.
export function MedicionesVivas({ sensores }: { sensores: Sensor[] }) {
  const [mediciones, setMediciones] = useState<Medicion[]>([])
  const [error, setError] = useState('')
  const [cargado, setCargado] = useState(false)
  const [enVivo, setEnVivo] = useState(true)

  // Mapa sensor_id → sensor, para no mostrar ids crudos.
  const porId = useMemo(() => {
    const mapa = new Map<number, Sensor>()
    for (const s of sensores) mapa.set(s.id, s)
    return mapa
  }, [sensores])

  useEffect(() => {
    if (!enVivo) return
    let activo = true

    async function cargar() {
      try {
        const data = await listarMediciones({ page: 1, limit: 20 })
        if (!activo) return
        setMediciones(data)
        setError('')
      } catch (err) {
        if (!activo) return
        setError(
          isAxiosError(err) && err.response?.status === 403
            ? 'No tienes permisos para ver mediciones.'
            : 'No se pudieron cargar las mediciones.',
        )
      } finally {
        if (activo) setCargado(true)
      }
    }

    cargar()
    const timer = setInterval(cargar, INTERVALO_MS)
    return () => {
      activo = false
      clearInterval(timer)
    }
  }, [enVivo])

  return (
    <div className="sn-card">
      <div className="mv-head">
        <h2 className="sn-form-titulo mv-titulo">
          <span className={`mv-dot ${enVivo ? 'mv-dot--on' : ''}`} />
          Últimas mediciones {enVivo && <em className="mv-vivo">en vivo</em>}
        </h2>
        <button className="sn-btn sn-btn--sm" onClick={() => setEnVivo((v) => !v)}>
          {enVivo ? '⏸ Pausar' : '▶ Reanudar'}
        </button>
      </div>

      {error && (
        <div className="sn-alert sn-alert--error" role="alert">
          {error}
        </div>
      )}

      {!cargado ? (
        <p className="sn-empty">Cargando mediciones…</p>
      ) : mediciones.length === 0 ? (
        <div className="sn-vacio">
          <p className="sn-vacio-titulo">Aún no hay mediciones.</p>
          <p className="sn-vacio-sub">
            Cuando el ESP32 reporte por <code>/ingest</code>, aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="sn-tabla-scroll">
          <table className="sn-tabla">
            <thead>
              <tr>
                <th>Cuándo</th>
                <th>Sensor</th>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Calidad</th>
              </tr>
            </thead>
            <tbody>
              {mediciones.map((m) => {
                const sensor = porId.get(m.sensor_id)
                return (
                  <tr key={m.id}>
                    <td>{hace(m.fecha_hora)}</td>
                    <td>
                      <code>{sensor ? sensor.codigo : `#${m.sensor_id}`}</code>
                    </td>
                    <td>{sensor?.tipo ?? '—'}</td>
                    <td>
                      <strong>{m.valor}</strong> {sensor?.unidad_medida ?? ''}
                    </td>
                    <td>
                      <span className={`sn-badge mv-cal--${m.calidad}`}>
                        {m.calidad}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
