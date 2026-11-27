import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { listarGalpones, type Galpon } from '@features/galpones/api/galpones'
import { useFirmware } from '@features/firmware/hooks/useFirmware'
import { listarSensores, type Sensor } from '@features/sensores/api/sensores'
import AsignarSensores from '@features/monitoreo/AsignarSensores'
import { ActuadoresGalpon } from '@features/monitoreo/components/ActuadoresGalpon'
import { tieneLecturaUtil, useMonitoreoAmbiental } from '@features/monitoreo/hooks/useMonitoreoAmbiental'
import SensoresGalpon from '@features/granjas/propietario/pestanas/ambiente/SensoresGalpon'
import '@fontsource-variable/oswald'
import '@features/granjas/propietario/pestanas/ambiente/AmbientePestana.css'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { IcChevronRight, IcChip, IcRefresh, IcThermo } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { hace } from '@shared/utils/fechas'
import { listarDispositivos, type Dispositivo } from './api/dispositivos'
import { filasFlota, type EstadoGalponFlota } from './model/flota'
import '@shared/ui/admin/AdminKit.css'
import './DispositivosPage.css'

const REFRESCO_MS = 20000

type Vista = 'monitoreo' | 'actuadores' | 'configurar'

const TEXTO_VISTA: Record<Vista, string> = {
  monitoreo: 'Monitoreo en vivo',
  actuadores: 'Actuadores',
  configurar: 'Configurar equipo',
}

const ETIQUETA: Record<EstadoGalponFlota, string> = {
  conectado: 'En línea',
  sin_reportar: 'Sin reportar',
  nunca: 'Nunca reportó',
  sin_controlador: 'Sin controlador',
}

function vistaDe(valor: string | null, tieneEquipo: boolean): Vista {
  if (valor === 'configurar') return 'configurar'
  if ((valor === 'monitoreo' || valor === 'actuadores') && tieneEquipo) return valor
  return tieneEquipo ? 'monitoreo' : 'configurar'
}

function ActuadoresEnVivo({ galponId }: { galponId: number }) {
  const { galpones, cargando, recargar } = useMonitoreoAmbiental()
  const galpon = galpones.find((item) => item.id === galponId) ?? null
  if (!galpon) {
    return (
      <p className="flota-detalle-nota" role="status">
        {cargando ? 'Cargando actuadores…' : 'Este galpón todavía no tiene datos.'}
      </p>
    )
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
    return (
      <p className="flota-detalle-nota" role="status">
        {cargando ? 'Cargando lecturas…' : 'Este galpón todavía no tiene lecturas.'}
      </p>
    )
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

function DispositivoDetallePage() {
  const { id } = useParams()
  const galponId = Number(id)
  const navigate = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const [galpones, setGalpones] = useState<Galpon[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const firmware = useFirmware()

  const recargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true)
    setError('')
    try {
      const [listaGalpones, listaDispositivos, listaSensores] = await Promise.all([
        listarGalpones(), listarDispositivos(), listarSensores(),
      ])
      setGalpones(listaGalpones)
      setDispositivos(listaDispositivos)
      setSensores(listaSensores)
    } catch (problema) {
      if (!silencioso) setError(mensajeDeError(problema, 'No se pudo cargar la ficha técnica del galpón.'))
    } finally {
      if (!silencioso) setCargando(false)
    }
  }, [])

  useEffect(() => {
    void recargar()
  }, [recargar])

  useRefetchOnFocus(() => {
    void recargar(true)
    void firmware.recargar()
  })

  const filas = useMemo(() => filasFlota(galpones, dispositivos), [galpones, dispositivos])
  const fila = filas.find((item) => item.galpon.id === galponId) ?? null
  const sensoresActivos = useMemo(
    () => sensores.filter((s) => s.estado === 'activo' && s.galpon.id === galponId).length,
    [sensores, galponId],
  )
  const versionPublicada = firmware.versiones.find((v) => v.vigente)?.version ?? null
  const tieneEquipo = (fila?.controladores.length ?? 0) > 0
  const vista = vistaDe(parametros.get('vista'), tieneEquipo)

  function cambiarVista(nueva: Vista) {
    const siguientes = new URLSearchParams(parametros)
    siguientes.set('vista', nueva)
    setParametros(siguientes, { replace: true })
  }

  if (cargando && filas.length === 0) {
    return (
      <div className="page-container flota-page adm-page">
        <p className="flota-detalle-nota" role="status">Cargando ficha técnica…</p>
      </div>
    )
  }

  if (!fila) {
    return (
      <div className="page-container flota-page adm-page">
        <nav className="flota-miga" aria-label="Ruta">
          <Link to="/dispositivos" className="flota-miga-volver">
            <IcChevronRight size={14} className="flota-miga-flecha" aria-hidden="true" />
            Volver a Dispositivos
          </Link>
        </nav>
        {error && (
          <div className="adm-alerta" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => void recargar()}>Reintentar</button>
          </div>
        )}
        <div className="flota-vacio">
          <IcChip size={24} aria-hidden="true" />
          <strong>Galpón no encontrado</strong>
          <p>No encontramos este galpón en la flota registrada.</p>
          <Link to="/dispositivos" className="adm-btn adm-btn--primario">Volver a Dispositivos</Link>
        </div>
      </div>
    )
  }

  const firmwarePendiente = Boolean(
    versionPublicada
    && fila.controladores.some((d) => d.version_firmware && d.version_firmware !== versionPublicada),
  )

  return (
    <div className="page-container flota-page flota-ficha-page adm-page">
      <nav className="flota-miga" aria-label="Navegación de la ficha técnica">
        <div className="flota-miga-izquierda">
          <Link to={`/dispositivos?galpon=${fila.galpon.id}`} className="flota-miga-volver">
            <IcChevronRight size={14} className="flota-miga-flecha" aria-hidden="true" />
            Dispositivos
          </Link>
          <span className="flota-miga-sep" aria-hidden="true">/</span>
          <span className="flota-miga-padre">{fila.organizacion}</span>
          <span className="flota-miga-sep" aria-hidden="true">/</span>
          <span className="flota-miga-actual">{fila.galpon.nombre}</span>
        </div>

        {filas.length > 1 && (
          <label className="flota-miga-cambio">
            <span>Cambiar galpón</span>
            <select
              value={fila.galpon.id}
              onChange={(evento) => {
                const destinoId = Number(evento.target.value)
                navigate(`/dispositivos/${destinoId}?vista=${vista}`)
              }}
            >
              {filas.map((item) => (
                <option key={item.galpon.id} value={item.galpon.id}>
                  {item.organizacion} · {item.galpon.nombre} ({item.galpon.codigo})
                </option>
              ))}
            </select>
          </label>
        )}
      </nav>

      <header className="flota-ficha-hero">
        <div className="flota-ficha-hero-info">
          <div className="flota-ficha-titulo-fila">
            <h1 className="flota-titulo">{fila.galpon.nombre}</h1>
            <code className="flota-ficha-codigo">{fila.galpon.codigo}</code>
            <span className={`flota-estado flota-estado--${fila.estado}`}>
              <span className="flota-estado-punto" aria-hidden="true" />
              {ETIQUETA[fila.estado]}
            </span>
          </div>
          <p className="flota-subtitulo">
            {fila.organizacion} · {fila.granja}
            {fila.ultimaConexion ? ` · Última señal ${hace(fila.ultimaConexion)}` : ''}
          </p>
          <div className="flota-detalle-chips">
            <span className="flota-detalle-chip">
              <IcChip size={14} aria-hidden="true" />
              {fila.controladores.length === 0
                ? 'Sin controlador'
                : fila.controladores
                  .map((d) => `${d.codigo_topic.replace(/^.*-ESP32-/, 'ESP32 ')} · v${d.version_firmware ?? '?'}`)
                  .join(' · ')}
            </span>
            <span className="flota-detalle-chip">
              <IcThermo size={14} aria-hidden="true" />
              {sensoresActivos === 1 ? '1 sensor activo' : `${sensoresActivos} sensores activos`}
            </span>
            {firmwarePendiente && versionPublicada && (
              <span className="flota-detalle-chip flota-detalle-chip--aviso">
                <IcRefresh size={13} aria-hidden="true" />
                Actualización pendiente v{versionPublicada}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}

      <section className="flota-ficha-panel" aria-label={`Consola técnica de ${fila.galpon.nombre}`}>
        <nav className="flota-vistas flota-vistas--ficha" role="tablist" aria-label={`Vistas de ${fila.galpon.nombre}`}>
          {(['monitoreo', 'actuadores', 'configurar'] as const).map((clave) => (
            <button
              key={clave}
              type="button"
              role="tab"
              aria-selected={vista === clave}
              className={`flota-vista${vista === clave ? ' is-activa' : ''}`}
              disabled={clave !== 'configurar' && !tieneEquipo}
              onClick={() => cambiarVista(clave)}
            >
              {TEXTO_VISTA[clave]}
            </button>
          ))}
        </nav>

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
                recargar={() => recargar(true)}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default DispositivoDetallePage
