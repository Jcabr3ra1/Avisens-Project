import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getRolVista, getUsuario, type Usuario } from '@shared/api'
import { listarUsuarios } from '@features/usuarios/api/usuarios'
import { asignarGalpon } from '@features/usuarios/api/asignacionesGalpon'
import { IcChevronRight, IcSend, IcUsers } from '@shared/ui/icons/icons'
import {
  useHiloPrivado,
  usePrivadasEquipo,
} from '../hooks/useMensajesEquipo'
import type { ConversacionPrivadaEquipo } from '../api/mensajesEquipo'

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function iniciales(nombre: string): string {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase()
}

function nombreContacto(conversacion: ConversacionPrivadaEquipo, usuarioId: number | null): string {
  if (conversacion.participante_uno.id === usuarioId) return conversacion.participante_dos.nombre_completo
  return conversacion.participante_uno.nombre_completo
}

function HiloPrivado({ conversacion, onVolver }: {
  conversacion: ConversacionPrivadaEquipo
  onVolver: () => void
}) {
  const { mensajes, cargando, enviando, error, enviar } = useHiloPrivado(conversacion.id)
  const [borrador, setBorrador] = useState('')
  const usuarioId = getUsuario()?.id ?? null
  const finRef = useRef<HTMLDivElement>(null)
  const ultimoMensajeId = useRef<number | null>(null)
  const contacto = nombreContacto(conversacion, usuarioId)

  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1]
    if (!ultimo) return
    if (ultimoMensajeId.current === null || ultimo.emisor_id === usuarioId) {
      finRef.current?.scrollIntoView({ block: 'end' })
    }
    ultimoMensajeId.current = ultimo.id
  }, [mensajes, usuarioId])

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    const texto = borrador
    setBorrador('')
    await enviar(texto)
  }

  return (
    <section className="comunicacion-equipo" aria-label={`Chat privado con ${contacto}`}>
      <header className="comunicacion-equipo__head">
        <button type="button" className="comunicacion-equipo__volver" onClick={onVolver}>← Privados</button>
        <div className="comunicacion-privado__head-name">
          <span>{iniciales(contacto)}</span>
          <strong>{contacto}</strong>
        </div>
      </header>

      <div className="comunicacion-equipo__mensajes" aria-live="polite">
        {cargando ? (
          <p className="comunicacion-cargando" role="status">Cargando conversación…</p>
        ) : mensajes.length === 0 ? (
          <p className="comunicacion-ia__welcome">Este chat es privado. Escribe el primer mensaje.</p>
        ) : (
          mensajes.map((mensaje) => {
            const propio = mensaje.emisor_id === usuarioId
            return (
              <article key={mensaje.id} className={`comunicacion-msg${propio ? ' es-propio' : ''}`}>
                {!propio && <span className="comunicacion-msg__autor">{mensaje.emisor.nombre_completo}</span>}
                <p className="comunicacion-msg__texto">{mensaje.contenido}</p>
                <span className="comunicacion-msg__pie">{hora(mensaje.fecha_envio)}</span>
              </article>
            )
          })
        )}
        <div ref={finRef} />
      </div>

      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}
      <form className="comunicacion-composer" onSubmit={(evento) => void alEnviar(evento)}>
        <input value={borrador} onChange={(evento) => setBorrador(evento.target.value)} placeholder={`Mensaje para ${contacto}…`} aria-label={`Mensaje privado para ${contacto}`} maxLength={2000} />
        <button type="submit" disabled={!borrador.trim() || enviando} aria-label="Enviar mensaje privado"><IcSend size={19} aria-hidden="true" /></button>
      </form>
    </section>
  )
}

function PanelPrivados({ galponId }: { galponId: number }) {
  const { contactos, conversaciones, cargando, abriendo, error, abrir, recargar } = usePrivadasEquipo(galponId)
  const [abierta, setAbierta] = useState<ConversacionPrivadaEquipo | null>(null)
  const [mostrarOperarios, setMostrarOperarios] = useState(false)
  const [operarios, setOperarios] = useState<Usuario[]>([])
  const [cargandoOperarios, setCargandoOperarios] = useState(false)
  const [asignandoId, setAsignandoId] = useState<number | null>(null)
  const [errorAsignacion, setErrorAsignacion] = useState('')
  const usuarioId = getUsuario()?.id ?? null
  const puedeGestionarEquipo = ['Administrador', 'Propietario'].includes(getRolVista() ?? '')

  async function iniciar(destinatarioId: number) {
    const conversacion = await abrir(destinatarioId)
    if (conversacion) setAbierta(conversacion)
  }

  async function cargarOperarios() {
    setMostrarOperarios((visible) => !visible)
    if (mostrarOperarios || cargandoOperarios) return

    setCargandoOperarios(true)
    setErrorAsignacion('')
    try {
      const idsDelEquipo = new Set(contactos.map((contacto) => contacto.id))
      const usuarios = await listarUsuarios()
      setOperarios(usuarios.filter((usuario) => (
        usuario.activo
        && usuario.rol.nombre === 'Operario'
        && !idsDelEquipo.has(usuario.id)
      )))
    } catch {
      setErrorAsignacion('No pudimos cargar los operarios disponibles.')
    } finally {
      setCargandoOperarios(false)
    }
  }

  async function incorporarOperario(operario: Usuario) {
    setAsignandoId(operario.id)
    setErrorAsignacion('')
    try {
      await asignarGalpon(operario.id, galponId, 'galponero')
      await recargar()
      setOperarios((actuales) => actuales.filter((usuario) => usuario.id !== operario.id))
    } catch {
      setErrorAsignacion(`No fue posible incorporar a ${operario.nombre_completo}.`)
    } finally {
      setAsignandoId(null)
    }
  }

  if (abierta) return <HiloPrivado conversacion={abierta} onVolver={() => setAbierta(null)} />
  if (cargando) return <p className="comunicacion-cargando" role="status">Cargando chats privados…</p>

  return (
    <section className="comunicacion-privado" aria-labelledby="privados-title">
      <div className="comunicacion-privado__heading">
        <div>
          <p className="comunicacion-section-label">Solo entre ustedes</p>
          <h3 id="privados-title">Chats privados</h3>
        </div>
        {puedeGestionarEquipo && (
          <button type="button" className="comunicacion-privado__add" onClick={() => void cargarOperarios()}>
            {mostrarOperarios ? 'Cerrar lista' : 'Agregar operario'}
          </button>
        )}
      </div>

      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}
      {errorAsignacion && <p className="comunicacion-form-error" role="alert">{errorAsignacion}</p>}

      {mostrarOperarios && (
        <section className="comunicacion-privado__section" aria-label="Operarios disponibles">
          <p>Operarios disponibles</p>
          {cargandoOperarios ? (
            <p className="comunicacion-cargando" role="status">Cargando operarios…</p>
          ) : operarios.length === 0 ? (
            <div className="comunicacion-privado__empty">Todos los operarios disponibles ya están vinculados a este galpón.</div>
          ) : (
            <ul className="comunicacion-contactos">
              {operarios.map((operario) => (
                <li key={operario.id}>
                  <button type="button" onClick={() => void incorporarOperario(operario)} disabled={asignandoId !== null}>
                    <span className="comunicacion-privado__avatar" aria-hidden="true">{iniciales(operario.nombre_completo)}</span>
                    <span><strong>{operario.nombre_completo}</strong><small>Operario</small></span>
                    <span className="comunicacion-privado__action">Agregar</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {conversaciones.length > 0 && (
        <div className="comunicacion-privado__section">
          <p>Conversaciones recientes</p>
          <ul className="comunicacion-hilos" aria-label="Conversaciones privadas recientes">
            {conversaciones.map((conversacion) => {
              const contacto = nombreContacto(conversacion, usuarioId)
              const ultimo = conversacion.mensajes[0]
              return (
                <li key={conversacion.id}>
                  <button type="button" className="comunicacion-hilo" onClick={() => setAbierta(conversacion)}>
                    <span className="comunicacion-privado__avatar" aria-hidden="true">{iniciales(contacto)}</span>
                    <span className="comunicacion-hilo__ident">
                      <strong>{contacto}</strong>
                      <span className="comunicacion-hilo__ultimo">{ultimo?.contenido ?? 'Sin mensajes todavía'}</span>
                    </span>
                    {conversacion._count.mensajes > 0 && <span className="comunicacion-hilo__badge">{conversacion._count.mensajes}</span>}
                    <IcChevronRight size={14} aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="comunicacion-privado__section">
        <p>Personas del equipo</p>
        {contactos.length === 0 ? (
          <div className="comunicacion-privado__empty">
            <IcUsers size={20} aria-hidden="true" />
            <span>No hay operarios asignados a este galpón todavía.</span>
          </div>
        ) : (
          <ul className="comunicacion-contactos" aria-label="Personas disponibles para un chat privado">
            {contactos.map((contacto) => (
              <li key={contacto.id}>
                <button type="button" onClick={() => void iniciar(contacto.id)} disabled={abriendo}>
                  <span className="comunicacion-privado__avatar" aria-hidden="true">{iniciales(contacto.nombre_completo)}</span>
                  <span>
                    <strong>{contacto.nombre_completo}</strong>
                    <small>{contacto.rol_asignacion ?? contacto.rol}</small>
                  </span>
                  <IcChevronRight size={15} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default PanelPrivados
