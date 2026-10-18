import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getRol } from '@shared/api'
import type { Notificacion } from '@features/notificaciones/api/notificaciones'
import { IcAlert, IcBell, IcCheck, IcRefresh, IcUserCircle } from '@shared/ui/icons/icons'
import { useNotificaciones } from './hooks/useNotificaciones'
import EstadoVacioAnimado from '@shared/ui/Animacion/EstadoVacioAnimado'
import CargandoAnimado from '@shared/ui/Animacion/CargandoAnimado'
import '@shared/ui/admin/AdminKit.css'
import './NotificacionesPage.css'

const ETIQUETAS_TIPO: Record<string, string> = {
  recuperacion_password: 'Acceso',
  seguridad_cuenta: 'Seguridad',
  sistema: 'Sistema',
  alerta: 'Alerta',
}

type Filtro = 'todas' | 'sin_leer'

function IconoTipo({ tipo }: { tipo: string }) {
  if (tipo === 'alerta') return <IcAlert size={17} />
  if (tipo === 'recuperacion_password') return <IcRefresh size={17} />
  if (tipo === 'seguridad_cuenta') return <IcUserCircle size={17} />
  return <IcBell size={17} />
}

function esHoy(fecha: string): boolean {
  const dia = new Date(fecha)
  const hoy = new Date()
  return dia.getFullYear() === hoy.getFullYear() && dia.getMonth() === hoy.getMonth() && dia.getDate() === hoy.getDate()
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

  const [filtro, setFiltro] = useState<Filtro>('todas')

  const ordenadas = [...notificaciones].filter((notificacion) => filtro === 'todas' || !notificacion.leida).sort((a, b) => {
    if (a.leida !== b.leida) return a.leida ? 1 : -1
    return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
  })

  const irARecuperaciones = (notificacion: Notificacion) => {
    if (!notificacion.leida) void marcarLeida(notificacion.id)
    navigate('/recuperaciones-password')
  }

  const irAUsuarios = (notificacion: Notificacion) => {
    if (!notificacion.leida) void marcarLeida(notificacion.id)
    navigate('/usuarios')
  }

  return (
    <div className="page-container not-page adm-page">
      <header className="not-cabecera">
        <div>
          <span className="adm-eyebrow">
            <span className="adm-eyebrow-punto" aria-hidden="true" />
            Centro de avisos
          </span>
          <h1 className="not-titulo-pagina">Notificaciones</h1>
          <p className="not-subtitulo">{noLeidas > 0 ? `Tienes ${noLeidas} sin leer.` : 'Estás al día.'}</p>
        </div>
        <button className="not-boton-cabecera" type="button" onClick={() => void marcarTodas()} disabled={noLeidas === 0 || cargando}>
          <IcCheck size={16} aria-hidden="true" /> Marcar todas como leídas
        </button>
      </header>

      <ul className="not-indicadores" aria-label="Resumen de notificaciones">
        <li><span>Sin leer</span><strong>{cargando ? '—' : noLeidas}</strong><small>Esperan tu revisión</small></li>
        <li><span>Hoy</span><strong>{cargando ? '—' : notificaciones.filter((notificacion) => esHoy(notificacion.fecha_creacion)).length}</strong><small>Recibidas hoy</small></li>
        <li><span>Total</span><strong>{cargando ? '—' : notificaciones.length}</strong><small>En tu bandeja</small></li>
      </ul>

      {!cargando && notificaciones.length > 0 && (
        <div className="not-herramientas" role="tablist" aria-label="Filtrar notificaciones">
          {([['todas', 'Todas', notificaciones.length], ['sin_leer', 'Sin leer', noLeidas]] as const).map(([valor, etiqueta, conteo]) => (
            <button key={valor} type="button" role="tab" aria-selected={filtro === valor} className="not-filtro" onClick={() => setFiltro(valor)}>
              {etiqueta}<span>{conteo}</span>
            </button>
          ))}
        </div>
      )}

      {error && <p className="not-aviso not-aviso--error adm-alerta" role="alert">{error}</p>}

      {cargando ? (
        <CargandoAnimado texto="Cargando notificaciones…" />
      ) : ordenadas.length === 0 ? (
        <EstadoVacioAnimado
          className="not-vacio"
          animacion="bandeja-vacia"
          titulo={filtro === 'sin_leer' ? 'Todo leído' : 'No tienes notificaciones'}
          texto={filtro === 'sin_leer' ? 'No hay avisos pendientes por revisar.' : 'Cuando el sistema genere un aviso para ti, aparecerá aquí.'}
        />
      ) : (
        <ul className="not-lista">
          {ordenadas.map((notificacion) => (
            <li key={notificacion.id} className={`not-tarjeta${notificacion.leida ? '' : ' not-tarjeta--no-leida'}`}>
              <span className={`not-icono not-icono--${notificacion.tipo}`} aria-hidden="true"><IconoTipo tipo={notificacion.tipo} /></span>
              <div className="not-contenido">
                <div className="not-encabezado">
                  <span className={`not-tipo not-tipo--${notificacion.tipo}`}>
                    {ETIQUETAS_TIPO[notificacion.tipo] ?? 'Aviso'}
                  </span>
                  <strong className="not-titulo">{notificacion.titulo}</strong>
                </div>
                <p className="not-mensaje">{notificacion.mensaje}</p>
              </div>
              <time className="not-fecha" dateTime={notificacion.fecha_creacion}>
                {formatearFecha(notificacion.fecha_creacion)}
              </time>
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
                {notificacion.tipo === 'seguridad_cuenta' && rol === 'Administrador' && (
                  <button
                    className="not-boton not-boton--principal"
                    type="button"
                    onClick={() => irAUsuarios(notificacion)}
                  >
                    Revisar cuenta
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
