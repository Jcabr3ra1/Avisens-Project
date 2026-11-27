import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarNotificaciones, marcarNotificacionLeida, marcarTodasLeidas, type Notificacion } from '@features/notificaciones/api/notificaciones'
import { IcAlert, IcBell, IcCheck, IcRefresh, IcUserCircle } from '@shared/ui/icons/icons'
import { useConteoNotificaciones } from '@features/notificaciones/hooks/useNotificaciones'
import '@shared/ui/insignia-notificacion.css'
import './CampanaNotificaciones.css'

const VISIBLES = 5

function hace(fechaIso: string): string {
  const minutos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60_000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.floor(horas / 24)} d`
}

function IconoTipo({ tipo }: { tipo: string }) {
  if (tipo === 'alerta') return <IcAlert size={15} />
  if (tipo === 'recuperacion_password') return <IcRefresh size={15} />
  if (tipo === 'seguridad_cuenta') return <IcUserCircle size={15} />
  return <IcBell size={15} />
}

function CampanaNotificaciones() {
  const navigate = useNavigate()
  const { noLeidas, actualizarConteo } = useConteoNotificaciones()
  const [abierto, setAbierto] = useState(false)
  const [recientes, setRecientes] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)
  const cerrar = useCallback(() => setAbierto(false), [])
  const [conteoVisible, setConteoVisible] = useState(noLeidas)

  useEffect(() => {
    if (noLeidas > 0) setConteoVisible(noLeidas)
  }, [noLeidas])

  useEffect(() => {
    if (!abierto) return

    const alClicar = (evento: MouseEvent) => {
      if (!contenedor.current?.contains(evento.target as Node)) cerrar()
    }
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar()
    }

    document.addEventListener('mousedown', alClicar)
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.removeEventListener('mousedown', alClicar)
      window.removeEventListener('keydown', alTeclear)
    }
  }, [abierto, cerrar])

  // Solo pedimos la lista al abrir: el conteo del badge ya viaja aparte,
  // así el sidebar no carga notificaciones en cada pantalla.
  useEffect(() => {
    if (!abierto) return
    let vigente = true
    setCargando(true)
    listarNotificaciones({ limit: 20 })
      .then((lista) => {
        if (!vigente) return
        const ordenadas = [...lista].sort((a, b) => {
          if (a.leida !== b.leida) return a.leida ? 1 : -1
          return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
        })
        setRecientes(ordenadas.slice(0, VISIBLES))
      })
      .catch(() => { if (vigente) setRecientes([]) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [abierto])

  async function abrirNotificacion(notificacion: Notificacion) {
    cerrar()
    if (!notificacion.leida) {
      await marcarNotificacionLeida(notificacion.id).catch(() => undefined)
      await actualizarConteo()
    }
    navigate(
      notificacion.tipo === 'recuperacion_password'
        ? '/recuperaciones-password'
        : notificacion.tipo === 'alerta'
          ? '/alertas'
        : '/notificaciones',
    )
  }

  async function marcarTodo() {
    await marcarTodasLeidas().catch(() => undefined)
    await actualizarConteo()
    setRecientes((previas) => previas.map((n) => ({ ...n, leida: true })))
  }

  return (
    <div className="dash-campana" ref={contenedor}>
      <button
        type="button"
        className={`dash-campana-boton${abierto ? ' abierta' : ''}`}
        onClick={() => setAbierto((valor) => !valor)}
        aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        title="Notificaciones"
      >
        <IcBell size={19} />
        <span className="t-badge" data-open={noLeidas > 0} aria-hidden="true">
          <span className="t-badge-dot dash-campana-punto">
            {conteoVisible > 9 ? '9+' : conteoVisible}
          </span>
        </span>
      </button>

      {abierto && (
        <div className="dash-campana-popover" role="dialog" aria-label="Notificaciones">
          <div className="dash-campana-head">
            <div>
              <strong>Notificaciones</strong>
              <small>{noLeidas > 0 ? `${noLeidas} sin leer` : 'Estás al día'}</small>
            </div>
            {noLeidas > 0 && (
              <button type="button" className="dash-campana-todas" onClick={() => void marcarTodo()}>
                <IcCheck size={13} /> Marcar leídas
              </button>
            )}
          </div>

          <div className="dash-campana-lista">
            {cargando ? (
              <p className="dash-campana-estado" role="status">Cargando…</p>
            ) : recientes.length === 0 ? (
              <div className="dash-campana-vacio">
                <IcBell size={22} />
                <strong>Nada nuevo por ahora</strong>
                <span>Aquí verás alertas, accesos por restablecer y avisos del sistema.</span>
              </div>
            ) : (
              recientes.map((notificacion) => (
                <button
                  key={notificacion.id}
                  type="button"
                  className={`dash-campana-item${notificacion.leida ? '' : ' sin-leer'}`}
                  onClick={() => void abrirNotificacion(notificacion)}
                >
                  <span className={`dash-campana-icono dash-campana-icono--${notificacion.tipo}`} aria-hidden="true">
                    <IconoTipo tipo={notificacion.tipo} />
                  </span>
                  <span className="dash-campana-item-texto">
                    <span className="dash-campana-item-titulo">{notificacion.titulo}</span>
                    <span className="dash-campana-item-msg">{notificacion.mensaje}</span>
                  </span>
                  <span className="dash-campana-item-fecha">{hace(notificacion.fecha_creacion)}</span>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            className="dash-campana-ver"
            onClick={() => { cerrar(); navigate('/notificaciones') }}
          >
            Ver todas las notificaciones
          </button>
        </div>
      )}
    </div>
  )
}

export default CampanaNotificaciones
