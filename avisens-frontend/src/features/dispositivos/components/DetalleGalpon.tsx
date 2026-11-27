import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IcArrowRight,
  IcChip,
  IcClose,
  IcPointer,
  IcRefresh,
  IcSidebar,
} from '@shared/ui/icons/icons'
import { hace } from '@shared/utils/fechas'
import type { EstadoGalponFlota, FilaFlota } from '../model/flota'

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
}: {
  fila: FilaFlota | null
  sensores: number
  versionPublicada: string | null
  cargando: boolean
  abiertoMovil: boolean
  onCerrarMovil: () => void
}) {
  const navigate = useNavigate()
  const tieneEquipo = (fila?.controladores.length ?? 0) > 0

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

  function abrirFicha(vista?: 'monitoreo' | 'actuadores' | 'configurar') {
    if (!fila) return
    const destino = vista ?? (tieneEquipo ? 'monitoreo' : 'configurar')
    navigate(`/dispositivos/${fila.galpon.id}?vista=${destino}`)
  }

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
        className={`flota-detalle flota-detalle--inspector${abiertoMovil ? ' is-abierto-movil' : ''}`}
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
          <div className="flota-inspector-cuerpo" key={fila.galpon.id} aria-live="polite">
            <div className="flota-inspector-cabecera">
              <h2 className="flota-detalle-nombre">{fila.galpon.nombre}</h2>
              <p className="flota-detalle-lugar">
                {fila.organizacion} · {fila.granja} · <code>{fila.galpon.codigo}</code>
              </p>
            </div>

            <dl className="flota-inspector-metricas">
              <div>
                <dt>Controladores</dt>
                <dd>{fila.controladores.length}</dd>
              </div>
              <div>
                <dt>Sensores activos</dt>
                <dd>{sensores}</dd>
              </div>
              <div className="flota-inspector-metrica-ancha">
                <dt>Última señal</dt>
                <dd>{fila.ultimaConexion ? hace(fila.ultimaConexion) : 'Sin señal registrada'}</dd>
              </div>
            </dl>

            {firmwarePendiente && versionPublicada && (
              <div className="flota-inspector-aviso">
                <IcRefresh size={14} aria-hidden="true" />
                <span>Actualización disponible a firmware v{versionPublicada}</span>
              </div>
            )}

            <div className="flota-inspector-bloque">
              <span className="flota-inspector-rotulo">Controladores ESP32</span>
              {fila.controladores.length === 0 ? (
                <p className="flota-inspector-vacio">
                  Este galpón aún no tiene controlador registrado. Abre la ficha técnica para instalar el ESP32 y sus sensores.
                </p>
              ) : (
                <ul className="flota-inspector-lista">
                  {fila.controladores.map((ctrl) => (
                    <li key={ctrl.id}>
                      <span className="flota-inspector-ctrl-nombre">
                        <IcChip size={14} aria-hidden="true" />
                        <code>{ctrl.codigo_topic}</code>
                      </span>
                      <span className="flota-inspector-ctrl-ver">v{ctrl.version_firmware ?? '?'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flota-inspector-pie">
              <button
                type="button"
                className="adm-btn adm-btn--primario flota-inspector-cta"
                onClick={() => abrirFicha()}
              >
                Abrir ficha técnica
                <IcArrowRight size={15} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flota-detalle-vacio">
            <IcPointer size={24} aria-hidden="true" />
            <p>{cargando ? 'Cargando galpones…' : 'Elige un galpón de la lista para ver su resumen y abrir su ficha técnica.'}</p>
          </div>
        )}
      </aside>
    </>
  )
}

export default DetalleGalpon
