// CamaraGalpon.tsx — Última foto de la ESP32-CAM del galpón con los pollos
// que detectó el servidor (modelo YOLO): verde normal, amarillo quieto, rojo
// posible muerto. "Posible muerto" es solo tiempo sin moverse: una señal para
// revisar, no un diagnóstico. Sin cámara en el galpón no muestra nada.

import { useEffect, useRef, useState } from 'react'
import {
  obtenerCamaraGalpon,
  obtenerImagenAnalisis,
  type CamaraGalpon,
  type EstadoPolloCamara,
} from '@features/analisis-vision/api/analisis-vision'
import { formatearUltimaLectura } from './hooks/useMonitoreoAmbiental'
// Estilos propios: la tarjeta también se usa en el monitoreo de granja del
// administrador, que no carga los de MonitoreoPage.
import '@shared/ui/admin/AdminKit.css'
import './MonitoreoPage.css'

const INTERVALO_MS = 15000

const COLOR: Record<EstadoPolloCamara, string> = {
  normal: '#10b981',
  quieto: '#f59e0b',
  posible_muerto: '#ef4444',
}

export function CamaraGalpon({ galponId }: { galponId: number }) {
  const [camara, setCamara] = useState<CamaraGalpon | null>(null)
  const [urlFoto, setUrlFoto] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [, setTic] = useState(0)
  const fotoDe = useRef<number | null>(null)

  useEffect(() => {
    let activo = true
    setCamara(null)
    fotoDe.current = null

    async function cargar() {
      try {
        const datos = await obtenerCamaraGalpon(galponId)
        if (!activo) return
        setCamara(datos)
        setError('')
        const ultimo = datos.ultimo
        // La foto solo se descarga cuando llega un análisis nuevo.
        if (ultimo?.tiene_imagen && fotoDe.current !== ultimo.id) {
          const blob = await obtenerImagenAnalisis(ultimo.id)
          if (!activo) return
          fotoDe.current = ultimo.id
          setUrlFoto((anterior) => {
            if (anterior) URL.revokeObjectURL(anterior)
            return URL.createObjectURL(blob)
          })
        }
      } catch {
        if (activo) setError('No se pudo cargar la cámara del galpón.')
      }
    }

    void cargar()
    const timer = setInterval(() => { void cargar() }, INTERVALO_MS)
    return () => { activo = false; clearInterval(timer) }
  }, [galponId])

  useEffect(() => () => { if (urlFoto) URL.revokeObjectURL(urlFoto) }, [urlFoto])

  // Refresca el "hace Xs" aunque no llegue un análisis nuevo.
  useEffect(() => {
    const timer = setInterval(() => setTic((t) => t + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const ultimo = camara?.ultimo
  if (!ultimo && !error) return null

  const r = ultimo?.resultado
  const historial = camara?.historial ?? []
  const maxConteo = Math.max(1, ...historial.map((h) => h.conteo))

  return (
    <section className="mon-section mon-camara">
      <div className="mon-vivo-head">
        <div>
          <h2 className="mon-section-title">Cámara del galpón</h2>
          <p className="mon-section-sub">
            Detección de pollos con IA · Última foto:{' '}
            {ultimo ? formatearUltimaLectura(new Date(ultimo.fecha_hora).getTime()) : '—'}
          </p>
        </div>
      </div>

      {error && <div className="mon-alert adm-alerta" role="alert">{error}</div>}

      {r && (
        <div className="mon-camara-cuerpo">
          <div className="mon-camara-foto adm-panel">
            {urlFoto ? (
              <div className="mon-camara-lienzo">
                <img src={urlFoto} alt={`Última foto de la cámara: ${r.conteo} pollos detectados`} />
                <svg viewBox={`0 0 ${r.ancho} ${r.alto}`} preserveAspectRatio="none" aria-hidden="true">
                  {r.pollos.map((p) => (
                    <rect key={p.id} x={p.x1} y={p.y1} width={p.x2 - p.x1} height={p.y2 - p.y1}
                      fill="none" stroke={COLOR[p.estado]} strokeWidth={p.estado === 'normal' ? 1.5 : 3}
                      vectorEffect="non-scaling-stroke">
                      <title>{`Pollo #${p.id} · ${p.estado === 'normal' ? 'normal' : `${p.estado === 'quieto' ? 'quieto' : 'posible muerto'} hace ${p.minutos_quieto} min`}`}</title>
                    </rect>
                  ))}
                </svg>
              </div>
            ) : (
              <p className="mon-vivo-vacio">{ultimo?.tiene_imagen ? 'Cargando foto…' : 'Este análisis no tiene foto.'}</p>
            )}
          </div>

          <div className="mon-camara-datos">
            <div className="mon-camara-cifras">
              <div className="adm-panel"><strong>{r.conteo}</strong><span>pollos</span></div>
              <div className="adm-panel mon-camara-cifra--quieto"><strong>{r.quietos}</strong><span>quietos (+{r.umbrales.quieto_min} min)</span></div>
              <div className="adm-panel mon-camara-cifra--muerto"><strong>{r.posibles_muertos}</strong><span>posibles muertos (+{r.umbrales.muerto_min} min)</span></div>
            </div>
            {r.posibles_muertos > 0 && (
              <p className="mon-alert adm-alerta" role="status">
                Hay pollos que no se mueven hace más de {r.umbrales.muerto_min} minutos. Revisa el galpón:
                puede ser un pollo muerto o enfermo.
              </p>
            )}
            <ul className="mon-camara-leyenda">
              <li><span style={{ background: COLOR.normal }} /> Normal</li>
              <li><span style={{ background: COLOR.quieto }} /> Quieto</li>
              <li><span style={{ background: COLOR.posible_muerto }} /> Posible muerto</li>
            </ul>
            {historial.length > 1 && (
              <div className="mon-camara-historial">
                <span>Pollos en las últimas {historial.length} fotos</span>
                <div className="mon-vivo-franja" role="img"
                  aria-label={`Conteo de pollos en las últimas ${historial.length} fotos`}>
                  {historial.map((h) => (
                    <span key={h.fecha_hora} className="mon-camara-barra"
                      style={{ height: `${Math.max(6, (h.conteo / maxConteo) * 100)}%` }}
                      title={`${h.conteo} pollos · ${new Date(h.fecha_hora).toLocaleTimeString('es-CO')}`} />
                  ))}
                </div>
              </div>
            )}
            <p className="mon-camara-nota">
              Modelo {r.modelo}. "Posible muerto" se basa solo en el tiempo sin moverse: es una señal para revisar,
              no un diagnóstico.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
