import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { IcClose, IcEye, IcRefresh } from '@shared/ui/icons/icons'
import { iconoSensor } from '@shared/ui/sensorIcon'
import { useFocoAtrapado } from '@shared/ui/Modal/useFocoAtrapado'
import { SensorDetail } from '@features/monitoreo/SensorDetail'
import {
  AYUDA_SALIDA_REPORTADA,
  estaEncendido,
  formatearUltimaLectura,
  textoSalidaReportada,
  tieneLecturaUtil,
  useMonitoreoAmbiental,
  type EstadoSensorVista,
  type GalponMonitoreoVista,
  type SensorVista,
} from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import './MonitoreoGranja.css'

type Props = {
  granjaId: number
  granjaNombre: string
  onCerrar: () => void
}

const ETIQUETA: Record<EstadoSensorVista, string> = {
  optimo: 'Óptimo',
  advertencia: 'Advertencia',
  critico: 'Crítico',
  sin_umbral: 'Sin umbral',
  offline: 'Sin señal',
  lectura_no_disponible: 'Sin dato',
  obsoleta: 'Desactualizado',
}

// 'obsoleta' (el dato existe pero ya no es reciente) pesa más que 'optimo': sin
// esto, un galpón con todos los sensores desactualizados se vería como óptimo.
const GRAVEDAD: EstadoSensorVista[] = ['critico', 'advertencia', 'obsoleta', 'offline', 'lectura_no_disponible', 'sin_umbral', 'optimo']

function estadoDeGalpon(galpon: GalponMonitoreoVista): EstadoSensorVista | null {
  if (galpon.sensores.length === 0) return null
  return GRAVEDAD.find((estado) => galpon.sensores.some((sensor) => sensor.estado === estado)) ?? 'optimo'
}

function valorLegible(sensor: SensorVista): string {
  if (sensor.valor === null) return '—'
  // Relés y motores informan la salida que el ESP32 ordenó (1/0), no una
  // medida: se dice así y no como un número suelto.
  if (sensor.esEstado) return textoSalidaReportada(estaEncendido(sensor.valor))
  return Number.isInteger(sensor.valor) ? String(sensor.valor) : sensor.valor.toFixed(1)
}

function posicionEnRango(sensor: SensorVista): number | null {
  if (sensor.valor === null || sensor.minUmbral === null || sensor.maxUmbral === null) return null
  const margen = (sensor.maxUmbral - sensor.minUmbral) * 0.5
  const desde = sensor.minUmbral - margen
  const hasta = sensor.maxUmbral + margen
  return Math.min(100, Math.max(0, ((sensor.valor - desde) / (hasta - desde)) * 100))
}

function MonitoreoGranja({ granjaId, granjaNombre, onCerrar }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const { galpones, cargando, error, recargar } = useMonitoreoAmbiental()
  const propios = useMemo(() => galpones.filter((galpon) => galpon.granjaId === granjaId), [galpones, granjaId])
  const [galponId, setGalponId] = useState<number | null>(null)
  const [sensorActivo, setSensorActivo] = useState<SensorVista | null>(null)
  const galpon = propios.find((item) => item.id === galponId) ?? propios.find((item) => item.sensores.length > 0) ?? propios[0] ?? null

  useFocoAtrapado(panel, sensorActivo === null, onCerrar)

  const conteo = (estado: EstadoSensorVista) => galpon?.sensores.filter((sensor) => sensor.estado === estado).length ?? 0
  const alertas = conteo('critico') + conteo('advertencia')
  const sinSenal = conteo('offline') + conteo('lectura_no_disponible')

  return createPortal(
    <div className="mgr-velo" role="presentation">
      <motion.div
        ref={panel}
        className="mgr-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mgr-titulo"
        initial={{ x: 48, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
      >
        <header className="mgr-cabecera">
          <span className="mgr-cabecera-icono" aria-hidden="true"><IcEye size={20} /></span>
          <div>
            <h2 id="mgr-titulo">Monitoreo · {granjaNombre}</h2>
            <p>Lecturas en tiempo real de sus galpones. Toca un sensor para ver su gráfica.</p>
          </div>
          <button type="button" className="mgr-icono-boton" onClick={() => void recargar()} aria-label="Actualizar lecturas" title="Actualizar lecturas">
            <IcRefresh size={17} />
          </button>
          <button type="button" className="mgr-icono-boton" onClick={onCerrar} aria-label="Cerrar">
            <IcClose size={17} />
          </button>
        </header>

        <div className="mgr-cuerpo">
          {error && <p className="mgr-aviso" role="alert">{error}</p>}

          {cargando && propios.length === 0 ? (
            <div className="mgr-grid" aria-hidden="true">
              {[0, 1, 2, 3].map((indice) => <div key={indice} className="mgr-tarjeta-esqueleto org-brilla" />)}
            </div>
          ) : !galpon ? (
            <div className="mgr-vacio">
              <IcEye size={28} aria-hidden="true" />
              <h3>Esta granja no tiene galpones</h3>
              <p>Registra un galpón y conecta sus sensores desde la estructura de la organización.</p>
            </div>
          ) : (
            <>
              {propios.length > 1 && (
                <div className="mgr-galpones" role="tablist" aria-label="Galpones">
                  {propios.map((item) => {
                    const estado = estadoDeGalpon(item)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={item.id === galpon.id}
                        className={`mgr-galpon-tab${item.id === galpon.id ? ' is-activo' : ''}`}
                        onClick={() => { setGalponId(item.id); setSensorActivo(null) }}
                      >
                        <span className={`mgr-punto mgr-punto--${estado ?? 'vacio'}`} aria-hidden="true" />
                        {item.nombre}
                        <small>{item.codigo}</small>
                      </button>
                    )
                  })}
                </div>
              )}

              <section className="mgr-resumen" aria-label={`Resumen de ${galpon.nombre}`}>
                <div className="mgr-resumen-galpon">
                  <strong>{galpon.nombre}</strong>
                  <span>{galpon.codigo}{galpon.capacidadAves ? ` · capacidad ${galpon.capacidadAves.toLocaleString('es-CO')} aves` : ''}</span>
                </div>
                <dl className="mgr-resumen-datos">
                  <div><dt>Lote</dt><dd>{galpon.loteActivo ? galpon.loteActivo.codigo : 'Sin lote'}</dd></div>
                  <div><dt>Día de vida</dt><dd>{galpon.loteActivo ? galpon.diaVida : '—'}</dd></div>
                  <div><dt>Sensores</dt><dd>{galpon.sensores.length}</dd></div>
                  <div className={alertas > 0 ? 'is-alerta' : undefined}><dt>En alerta</dt><dd>{alertas}</dd></div>
                  <div className={sinSenal > 0 ? 'is-apagado' : undefined}><dt>Sin señal</dt><dd>{sinSenal}</dd></div>
                </dl>
              </section>

              {galpon.sensores.length === 0 ? (
                <div className="mgr-vacio">
                  <IcEye size={28} aria-hidden="true" />
                  <h3>Este galpón aún no tiene sensores</h3>
                  <p>Conéctalos desde el galpón, en «Controladores y sensores».</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.ul key={galpon.id} className="mgr-grid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    {galpon.sensores.map((sensor) => {
                      const posicion = posicionEnRango(sensor)
                      // Los sensores de estado (relés, motores) no tienen gauge ni
                      // histórico de valores: el panel de detalle no aplica.
                      const util = tieneLecturaUtil(sensor.estado) && !sensor.esEstado
                      return (
                        <li key={sensor.id}>
                          <button
                            type="button"
                            className={`mgr-sensor mgr-sensor--${sensor.estado}`}
                            onClick={() => setSensorActivo(sensor)}
                            disabled={!util}
                          >
                            <span className="mgr-sensor-cabecera">
                              <span className="mgr-sensor-icono" aria-hidden="true">{iconoSensor(sensor.tipo, 18)}</span>
                              <span className="mgr-sensor-tipo">{sensor.tipo}</span>
                              <span className="mgr-estado">{ETIQUETA[sensor.estado]}</span>
                              {sensor.sinCalibrar && sensor.valor !== null && (
                                <span className="mgr-estado" title="El ESP32 envió esta lectura sin calibración: el número no es una medida física confirmada.">Sin calibrar</span>
                              )}
                            </span>
                            <span className="mgr-sensor-valor">
                              <strong title={sensor.esEstado ? AYUDA_SALIDA_REPORTADA : undefined}>{valorLegible(sensor)}</strong>
                              {!sensor.esEstado && <small>{sensor.unidad}</small>}
                            </span>
                            {posicion !== null ? (
                              <span className="mgr-rango" aria-label={`Rango ideal ${sensor.minUmbral} a ${sensor.maxUmbral} ${sensor.unidad}`}>
                                <span className="mgr-rango-ideal" />
                                <span className="mgr-rango-marca" style={{ left: `${posicion}%` }} />
                              </span>
                            ) : (
                              <span className="mgr-rango-vacio">Sin rango configurado</span>
                            )}
                            <span className="mgr-sensor-pie">
                              <span>{sensor.minUmbral !== null && sensor.maxUmbral !== null ? `Ideal ${sensor.minUmbral}–${sensor.maxUmbral} ${sensor.unidad}` : sensor.codigo}</span>
                              <span>{formatearUltimaLectura(sensor.ultimaLecturaTs)}</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </motion.ul>
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      </motion.div>

      {galpon && (
        <SensorDetail
          sensor={sensorActivo}
          galponNombre={galpon.nombre}
          diaVida={galpon.loteActivo ? galpon.diaVida : null}
          onClose={() => setSensorActivo(null)}
        />
      )}
    </div>,
    document.body,
  )
}

export default MonitoreoGranja
