import { useEffect, useState } from 'react'
import AsignarSensores from '@features/monitoreo/AsignarSensores'
import { ActuadoresGalpon } from '@features/monitoreo/components/ActuadoresGalpon'
import { tieneLecturaUtil, useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import SensoresGalpon from '@features/granjas/propietario/pestanas/ambiente/SensoresGalpon'
import '@fontsource-variable/oswald'
import '@features/granjas/propietario/pestanas/ambiente/AmbientePestana.css'
import { IcChip, IcPointer, IcRefresh, IcSidebar, IcThermo } from '@shared/ui/icons/icons'
import { hace } from '@shared/utils/fechas'
import type { EstadoGalponFlota, FilaFlota } from '../model/flota'

const REFRESCO_MS = 20000

type Vista = 'monitoreo' | 'actuadores' | 'configurar'

const TEXTO_VISTA: Record<Vista, string> = {
  monitoreo: 'Monitoreo en vivo',
  actuadores: 'Actuadores',
  configurar: 'Configurar controladores y sensores',
}

// Actuadores del galpón con sus controles y su ficha. Mismos datos en vivo
// que el monitoreo; las órdenes se sondean aparte (useControlActuadores).
function ActuadoresEnVivo({ galponId }: { galponId: number }) {
  const { galpones, cargando, recargar } = useMonitoreoAmbiental()
  const galpon = galpones.find((item) => item.id === galponId) ?? null
  if (!galpon) {
    return <p className="flota-detalle-nota" role="status">{cargando ? 'Cargando actuadores…' : 'Este galpón todavía no tiene datos.'}</p>
  }
  return <ActuadoresGalpon galponId={galponId} sensores={galpon.sensores} onCambio={() => { void recargar() }} />
}

function MonitoreoEnVivo({ galponId }: { galponId: number }) {
  const { galpones, cargando, recargar } = useMonitoreoAmbiental()
  const galpon = galpones.find((item) => item.id === galponId) ?? null

  useEffect(() => {
    const intervalo = window.setInterval(() => { void recargar() }, REFRESCO_MS)
    return () => window.clearInterval(intervalo)
  }, [recargar])

  if (!galpon) {
    return <p className="flota-detalle-nota" role="status">{cargando ? 'Cargando lecturas…' : 'Este galpón todavía no tiene lecturas.'}</p>
  }
  const reportando = galpon.sensores.filter((sensor) => tieneLecturaUtil(sensor.estado)).length
  return (
    <div className="amb flota-monitoreo">
      <p className="flota-detalle-nota">
        <span className="flota-vivo" aria-hidden="true" /> Se actualiza solo cada {REFRESCO_MS / 1000} segundos.
      </p>
      <SensoresGalpon sensores={galpon.sensores} reportando={reportando} />
    </div>
  )
}

const ETIQUETA: Record<EstadoGalponFlota, string> = {
  conectado: 'En línea',
  sin_reportar: 'Sin reportar',
  nunca: 'Nunca reportó',
  sin_controlador: 'Sin controlador',
}

function DetalleGalpon({ fila, sensores, versionPublicada, cargando, onCambio }: {
  fila: FilaFlota | null
  sensores: number
  versionPublicada: string | null
  cargando: boolean
  onCambio: () => Promise<void>
}) {
  const tieneEquipo = (fila?.controladores.length ?? 0) > 0
  const [eleccion, setEleccion] = useState<{ galponId: number; vista: Vista } | null>(null)
  const vista: Vista = eleccion && eleccion.galponId === fila?.galpon.id
    ? eleccion.vista
    : tieneEquipo ? 'monitoreo' : 'configurar'

  return (
    <aside className="org-lista-panel flota-detalle" aria-label="Galpón seleccionado">
      <div className="org-lista-panel-cabecera">
        <IcSidebar size={16} aria-hidden="true" />
        <span>Galpón seleccionado</span>
      </div>
      {fila ? (
        <div className="flota-detalle-cuerpo" key={fila.galpon.id} aria-live="polite">
          <div className="flota-detalle-top">
            <span className={`flota-estado flota-estado--${fila.estado}`}>
              <span className="flota-estado-punto" aria-hidden="true" />
              {ETIQUETA[fila.estado]}
            </span>
            {fila.ultimaConexion && <span className="flota-detalle-visto">Última señal {hace(fila.ultimaConexion)}</span>}
          </div>
          <h2 className="flota-detalle-nombre">{fila.galpon.nombre}</h2>
          <p className="flota-detalle-lugar">{fila.organizacion} · {fila.granja} · {fila.galpon.codigo}</p>

          <ul className="org-lista-panel-recursos flota-detalle-recursos">
            <li>
              <span className="org-lista-panel-icono" aria-hidden="true"><IcChip size={18} /></span>
              <span>
                <strong>Controladores</strong>
                <small>
                  {fila.controladores.length === 0
                    ? 'Ninguno instalado'
                    : fila.controladores.map((d) => `${d.codigo_topic.replace(/^.*-ESP32-/, 'ESP32 ')} · v${d.version_firmware ?? '?'}`).join(', ')}
                </small>
              </span>
              <b>{fila.controladores.length}</b>
            </li>
            <li>
              <span className="org-lista-panel-icono" aria-hidden="true"><IcThermo size={18} /></span>
              <span><strong>Sensores activos</strong><small>Leen y envían cada pocos segundos</small></span>
              <b>{sensores}</b>
            </li>
            {versionPublicada && fila.controladores.some((d) => d.version_firmware && d.version_firmware !== versionPublicada) && (
              <li className="is-aviso">
                <span className="org-lista-panel-icono" aria-hidden="true"><IcRefresh size={18} /></span>
                <span><strong>Firmware pendiente</strong><small>Se instalará solo en su próxima consulta</small></span>
                <b>v{versionPublicada}</b>
              </li>
            )}
          </ul>

          <div className="flota-vistas" role="tablist" aria-label={`Vistas de ${fila.galpon.nombre}`}>
            {(['monitoreo', 'actuadores', 'configurar'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={vista === id}
                className="flota-vista"
                disabled={id !== 'configurar' && !tieneEquipo}
                onClick={() => setEleccion({ galponId: fila.galpon.id, vista: id })}
              >
                {TEXTO_VISTA[id]}
              </button>
            ))}
          </div>

          <div className="flota-detalle-config">
            {vista === 'monitoreo' ? (
              <MonitoreoEnVivo galponId={fila.galpon.id} />
            ) : vista === 'actuadores' ? (
              <ActuadoresEnVivo key={fila.galpon.id} galponId={fila.galpon.id} />
            ) : (
              <AsignarSensores
                key={fila.galpon.id}
                galponId={fila.galpon.id}
                galponCodigo={fila.galpon.codigo}
                galponNombre={fila.galpon.nombre}
                recargar={onCambio}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="org-lista-panel-cuerpo org-lista-panel-cuerpo--vacio">
          <IcPointer size={24} aria-hidden="true" />
          <p>{cargando ? 'Cargando galpones…' : 'Elige un galpón de la lista para ver y configurar sus controladores y sensores.'}</p>
        </div>
      )}
    </aside>
  )
}

export default DetalleGalpon
