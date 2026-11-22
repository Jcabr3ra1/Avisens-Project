import { useEffect, useState } from 'react'
import AsignarSensores from '@features/monitoreo/AsignarSensores'
import { ActuadoresGalpon } from '@features/monitoreo/components/ActuadoresGalpon'
import { tieneLecturaUtil, useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import SensoresGalpon from '@features/granjas/propietario/pestanas/ambiente/SensoresGalpon'
import '@fontsource-variable/oswald'
import '@features/granjas/propietario/pestanas/ambiente/AmbientePestana.css'
import { IcChip, IcClose, IcPointer, IcRefresh, IcSidebar, IcThermo } from '@shared/ui/icons/icons'
import { hace } from '@shared/utils/fechas'
import type { EstadoGalponFlota, FilaFlota } from '../model/flota'

const REFRESCO_MS = 20000

type Vista = 'monitoreo' | 'actuadores' | 'configurar'

const TEXTO_VISTA: Record<Vista, string> = {
  monitoreo: 'Monitoreo en vivo',
  actuadores: 'Actuadores',
  configurar: 'Configurar equipo',
}

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
        <span className="flota-vivo" aria-hidden="true" /> Se actualiza automáticamente cada {REFRESCO_MS / 1000} segundos.
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

function DetalleGalpon({
  fila,
  sensores,
  versionPublicada,
  cargando,
  abiertoMovil,
  onCerrarMovil,
  onCambio,
}: {
  fila: FilaFlota | null
  sensores: number
  versionPublicada: string | null
  cargando: boolean
  abiertoMovil: boolean
  onCerrarMovil: () => void
  onCambio: () => Promise<void>
}) {
  const tieneEquipo = (fila?.controladores.length ?? 0) > 0
  const [eleccion, setEleccion] = useState<{ galponId: number; vista: Vista } | null>(null)
  const vista: Vista = eleccion && eleccion.galponId === fila?.galpon.id
    ? eleccion.vista
    : tieneEquipo ? 'monitoreo' : 'configurar'

  useEffect(() => {
    if (!abiertoMovil) return
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onCerrarMovil()
    }
    window.addEventListener('keydown', alPresionarTecla)
    return () => window.removeEventListener('keydown', alPresionarTecla)
  }, [abiertoMovil, onCerrarMovil])

  const firmwarePendiente = Boolean(
    versionPublicada
    && fila?.controladores.some((d) => d.version_firmware && d.version_firmware !== versionPublicada),
  )

  return (
    <>
      {abiertoMovil && (
        <div
          className="flota-panel-fondo"
          aria-hidden="true"
          onClick={onCerrarMovil}
        />
      )}
      <aside
        className={`flota-detalle${abiertoMovil ? ' is-abierto-movil' : ''}`}
        aria-label="Galpón seleccionado"
      >
        <div className="flota-detalle-cabecera">
          <IcSidebar size={15} aria-hidden="true" />
          <span>Galpón seleccionado</span>
          {fila && (
            <span className={`flota-estado flota-estado--${fila.estado} flota-estado--cabecera`}>
              <span className="flota-estado-punto" aria-hidden="true" />
              {ETIQUETA[fila.estado]}
            </span>
          )}
          <button
            type="button"
            className="flota-detalle-cerrar"
            onClick={onCerrarMovil}
            aria-label="Cerrar panel del galpón"
          >
            <IcClose size={17} aria-hidden="true" />
          </button>
        </div>

        {fila ? (
          <div className="flota-detalle-marco" key={fila.galpon.id} aria-live="polite">
            <div className="flota-detalle-encabezado">
              <div className="flota-detalle-top">
                <div>
                  <h2 className="flota-detalle-nombre">{fila.galpon.nombre}</h2>
                  <p className="flota-detalle-lugar">{fila.organizacion} · {fila.granja} · {fila.galpon.codigo}</p>
                </div>
                {fila.ultimaConexion && (
                  <span className="flota-detalle-visto">Última señal {hace(fila.ultimaConexion)}</span>
                )}
              </div>

              <div className="flota-detalle-chips">
                <span className="flota-detalle-chip">
                  <IcChip size={14} aria-hidden="true" />
                  {fila.controladores.length === 0
                    ? 'Sin controlador'
                    : fila.controladores.map((d) => `${d.codigo_topic.replace(/^.*-ESP32-/, 'ESP32 ')} · v${d.version_firmware ?? '?'}`).join(' · ')}
                </span>
                <span className="flota-detalle-chip">
                  <IcThermo size={14} aria-hidden="true" />
                  {sensores === 1 ? '1 sensor activo' : `${sensores} sensores activos`}
                </span>
                {firmwarePendiente && versionPublicada && (
                  <span className="flota-detalle-chip flota-detalle-chip--aviso">
                    <IcRefresh size={13} aria-hidden="true" />
                    Actualización pendiente v{versionPublicada}
                  </span>
                )}
              </div>

              <nav className="flota-vistas" role="tablist" aria-label={`Vistas de ${fila.galpon.nombre}`}>
                {(['monitoreo', 'actuadores', 'configurar'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={vista === id}
                    className={`flota-vista${vista === id ? ' is-activa' : ''}`}
                    disabled={id !== 'configurar' && !tieneEquipo}
                    onClick={() => setEleccion({ galponId: fila.galpon.id, vista: id })}
                  >
                    {TEXTO_VISTA[id]}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flota-detalle-cuerpo">
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
          </div>
        ) : (
          <div className="flota-detalle-vacio">
            <IcPointer size={24} aria-hidden="true" />
            <p>{cargando ? 'Cargando galpones…' : 'Elige un galpón de la lista para ver y configurar sus controladores y sensores.'}</p>
          </div>
        )}
      </aside>
    </>
  )
}

export default DetalleGalpon
