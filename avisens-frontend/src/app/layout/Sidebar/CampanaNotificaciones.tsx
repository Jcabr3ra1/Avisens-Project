import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarNotificaciones, marcarNotificacionLeida, marcarTodasLeidas, type Notificacion } from '@features/notificaciones/api/notificaciones'
import { IcBell, IcCheck } from '@shared/ui/icons/icons'
import { useConteoNotificaciones } from '@features/notificaciones/hooks/useNotificaciones'

const VISIBLES = 5

function hace(fechaIso: string): string {
  const minutos = Math.floor((Date.now() - new Date(fechaIso).getTime()) / 60_000)
  if (minutos < 1) return 'ahora'
  if (minutos < 60) return `hace ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `hace ${horas} h`
  return `hace ${Math.floor(horas / 24)} d`
}

function CampanaNotificaciones() {
  const navigate = useNavigate()
  const { noLeidas, actualizarConteo } = useConteoNotificaciones()
  const [abierto, setAbierto] = useState(false)
  const [recientes, setRecientes] = useState<Notificacion[]>([])
  const [cargando, setCargando] = useState(false)
  const contenedor = useRef<HTMLDivElement>(null)

  const cerrar = useCallback(() => setAbierto(false), [])

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
        aria-label={
          noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones'
        }
        aria-expanded={abierto}
        title="Notificaciones"
      >
        <IcBell size={15} />
        {noLeidas > 0 && (
          <span className="dash-campana-punto" aria-hidden="true">
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="dash-campana-popover" role="dialog" aria-label="Notificaciones">
          <div className="dash-campana-head">
            <strong>Notificaciones</strong>
            {noLeidas > 0 && (
              <button type="button" className="dash-campana-todas" onClick={() => void marcarTodo()}>
                <IcCheck size={12} /> Marcar leídas
              </button>
            )}
          </div>

          <div className="dash-campana-lista">
            {cargando ? (
              <p className="dash-campana-estado" role="status">Cargando…</p>
            ) : recientes.length === 0 ? (
              <p className="dash-campana-estado">No tienes notificaciones.</p>
            ) : (
              recientes.map((notificacion) => (
                <button
                  key={notificacion.id}
                  type="button"
                  className={`dash-campana-item${notificacion.leida ? '' : ' sin-leer'}`}
                  onClick={() => void abrirNotificacion(notificacion)}
                >
                  <span className="dash-campana-item-titulo">{notificacion.titulo}</span>
                  <span className="dash-campana-item-msg">{notificacion.mensaje}</span>
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
            Ver todas
          </button>
        </div>
      )}
    </div>
  )
}

export default CampanaNotificaciones
