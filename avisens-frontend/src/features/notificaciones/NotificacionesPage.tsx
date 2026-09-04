import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import type { Notificacion } from '@features/notificaciones/api/notificaciones'
import { IcBell, IcCheck } from '@shared/ui/icons/icons'
import { useNotificaciones } from './hooks/useNotificaciones'
import './NotificacionesPage.css'

const ETIQUETAS_TIPO: Record<string, string> = {
  recuperacion_password: 'Acceso',
  sistema: 'Sistema',
}

function formatearFecha(fecha: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(fecha))
}

function NotificacionesPage() {
  const navigate = useNavigate()
  // El enlace de recuperación de acceso solo lo puede seguir un admin real.
  const rol = getRol()
  const {
    notificaciones,
    noLeidas,
    cargando,
    error,
    marcarLeida,
    marcarTodas,
    eliminar,
  } = useNotificaciones()

  const ordenadas = [...notificaciones].sort((a, b) => {
    if (a.leida !== b.leida) return a.leida ? 1 : -1
    return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
  })

  const irARecuperaciones = (notificacion: Notificacion) => {
    if (!notificacion.leida) void marcarLeida(notificacion.id)
    navigate('/recuperaciones-password')
  }

  return (
    <div className="page-container not-page">
      <header className="not-cabecera">
        <div>
          <h1>Notificaciones</h1>
          <p>Avisos del sistema para tu cuenta. {noLeidas > 0 && <strong>Tienes {noLeidas} sin leer.</strong>}</p>
        </div>
        <button
          className="not-boton not-boton--secundario"
          type="button"
          onClick={() => void marcarTodas()}
          disabled={noLeidas === 0 || cargando}
        >
          <IcCheck size={14} aria-hidden="true" /> Marcar todas como leídas
        </button>
      </header>

      {error && <p className="not-aviso not-aviso--error" role="alert">{error}</p>}

      {cargando ? (
        <p className="not-cargando" role="status">Cargando notificaciones…</p>
      ) : ordenadas.length === 0 ? (
        <section className="not-vacio">
          <IcBell size={32} aria-hidden="true" />
          <h2>No tienes notificaciones</h2>
          <p>Cuando el sistema genere un aviso para ti, aparecerá aquí.</p>
        </section>
      ) : (
        <ul className="not-lista">
          {ordenadas.map((notificacion) => (
            <li key={notificacion.id} className={`not-tarjeta${notificacion.leida ? '' : ' not-tarjeta--no-leida'}`}>
              <span className="not-punto" aria-hidden="true" />
              <div className="not-contenido">
                <div className="not-encabezado">
                  <span className={`not-tipo not-tipo--${notificacion.tipo}`}>
                    {ETIQUETAS_TIPO[notificacion.tipo] ?? 'Aviso'}
                  </span>
                  <strong className="not-titulo">{notificacion.titulo}</strong>
                  <time className="not-fecha" dateTime={notificacion.fecha_creacion}>
                    {formatearFecha(notificacion.fecha_creacion)}
                  </time>
                </div>
                <p className="not-mensaje">{notificacion.mensaje}</p>
              </div>
              <div className="not-acciones">
                {notificacion.tipo === 'recuperacion_password' && rol === 'Administrador' && (
                  <button
                    className="not-boton not-boton--principal"
                    type="button"
                    onClick={() => irARecuperaciones(notificacion)}
                  >
                    Revisar solicitudes
                  </button>
                )}
                {!notificacion.leida && (
                  <button
                    className="not-boton not-boton--secundario"
                    type="button"
                    onClick={() => void marcarLeida(notificacion.id)}
                  >
                    Marcar leída
                  </button>
                )}
                <button
                  className="not-boton not-boton--texto"
                  type="button"
                  onClick={() => void eliminar(notificacion.id)}
                  aria-label={`Eliminar notificación: ${notificacion.titulo}`}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default NotificacionesPage
