import { useEffect, useState } from 'react'
import { listarZonas, type ZonaGalpon } from '@features/galpones/api/zonas'
import type { GalponMonitoreoVista } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import { iconoSensor } from '@shared/ui/sensorIcon'
import {
  ANCHO_POR_DEFECTO,
  frescuraLecturas,
  LARGO_POR_DEFECTO,
  posicionPorcentaje,
  sensoresUbicados,
} from '../model/plano'

// El 3D y el térmico todavía no existen: se muestran deshabilitados con su
// razón, en vez de fingir que hacen algo.
const MODOS = [
  { id: '2d', etiqueta: '2D', activo: true, razon: '' },
  { id: '3d', etiqueta: '3D', activo: false, razon: 'La vista 3D aún no está disponible' },
  { id: 'termico', etiqueta: 'Térmico', activo: false, razon: 'Requiere cámara térmica en el galpón' },
]

function PlanoGalpon({ galpon }: { galpon: GalponMonitoreoVista | null }) {
  const [zonas, setZonas] = useState<ZonaGalpon[]>([])

  useEffect(() => {
    if (!galpon) {
      setZonas([])
      return
    }
    let vigente = true
    void listarZonas(galpon.id)
      .then((lista) => { if (vigente) setZonas(lista.filter((zona) => zona.activa)) })
      .catch(() => { if (vigente) setZonas([]) })
    return () => { vigente = false }
  }, [galpon])

  if (!galpon) {
    return (
      <section className="dash-plano dash-plano--vacio">
        <p>Selecciona un galpón para ver su plano.</p>
      </section>
    )
  }

  const ancho = galpon.anchoMetros ?? ANCHO_POR_DEFECTO
  const largo = galpon.largoMetros ?? LARGO_POR_DEFECTO
  const ubicados = sensoresUbicados(galpon.sensores)
  const frescura = frescuraLecturas(galpon.sensores)
  const sinUbicar = galpon.sensores.length - ubicados.length

  return (
    <section className="dash-plano" aria-label={`Plano de ${galpon.nombre}`}>
      <div className="dash-plano-ambiente" aria-hidden="true" />
      <div className="dash-plano-rejilla" aria-hidden="true" />

      <div className="dash-plano-cabecera">
        <div>
          <h2>{galpon.nombre}</h2>
          <p>
            {galpon.loteActivo
              ? `${galpon.loteActivo.cantidad_inicial.toLocaleString('es-CO')} alojadas · día ${galpon.diaVida}`
              : 'Sin lote activo'}
          </p>
        </div>
        <span className="dash-plano-medidas mono">
          {ancho} × {largo} m
          {galpon.anchoMetros === null && <em> (referencia)</em>}
        </span>
      </div>

      <div className="dash-plano-lienzo">
        {zonas.map((zona) => {
          const inicio = zona.coordenada_y_inicio ?? 0
          const fin = zona.coordenada_y_fin ?? 0
          if (fin <= inicio) return null
          return (
            <span
              key={zona.id}
              className="dash-plano-zona"
              style={{
                left: `${(inicio / largo) * 100}%`,
                width: `${((fin - inicio) / largo) * 100}%`,
                background: zona.color_visualizacion ?? 'rgba(0, 91, 72, 0.07)',
              }}
            >
              <span className="dash-plano-zona-nombre">{zona.nombre}</span>
            </span>
          )
        })}

        {ubicados.map((sensor) => (
          <span
            key={sensor.id}
            className={`dash-plano-sensor dash-plano-sensor--${sensor.estado}`}
            style={posicionPorcentaje(sensor, ancho, largo)}
            title={`${sensor.codigo} · ${sensor.tipo}: ${sensor.valor ?? '—'} ${sensor.unidad}`}
          >
            {iconoSensor(sensor.tipo, 13)}
            <span className="dash-plano-sensor-valor mono">
              {sensor.valor ?? '—'}
            </span>
          </span>
        ))}

        {ubicados.length === 0 && (
          <p className="dash-plano-aviso">
            {galpon.sensores.length === 0
              ? 'Este galpón no tiene sensores registrados.'
              : 'Los sensores de este galpón no tienen coordenadas. Regístralas para verlos en el plano.'}
          </p>
        )}
      </div>

      <div className="dash-plano-pie">
        <div className="dash-plano-modos" role="group" aria-label="Modo de visualización">
          {MODOS.map((modo) => (
            <button
              key={modo.id}
              type="button"
              className={`dash-plano-modo${modo.activo ? ' es-activo' : ''}`}
              disabled={!modo.activo}
              title={modo.razon || undefined}
            >
              {modo.etiqueta}
            </button>
          ))}
        </div>

        <div className={`dash-plano-vivo${frescura.enVivo ? ' es-vivo' : ''}`}>
          <span className="dash-status-pulse"><span className="dot" /><span className="ring" /></span>
          <span className="mono">{frescura.texto}</span>
        </div>
      </div>

      {sinUbicar > 0 && ubicados.length > 0 && (
        <p className="dash-plano-nota">
          {sinUbicar} {sinUbicar === 1 ? 'sensor sin coordenadas' : 'sensores sin coordenadas'}
        </p>
      )}
    </section>
  )
}

export default PlanoGalpon
