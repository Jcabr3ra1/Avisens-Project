import { useEffect, useRef, useState, type FormEvent } from 'react'
import { getUsuario } from '@shared/api'
import { IcChevronRight, IcSend, IcUsers } from '@shared/ui/icons/icons'
import { useHiloEquipo, useResumenEquipo } from '../hooks/useMensajesEquipo'
import type { MensajeEquipo } from '../api/mensajesEquipo'

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function ListaGalpones({ onAbrir }: { onAbrir: (id: number, nombre: string) => void }) {
  const { resumen, cargando, error } = useResumenEquipo(true)

  if (cargando) return <p className="comunicacion-cargando" role="status">Cargando conversaciones…</p>
  if (error) return <p className="comunicacion-form-error" role="alert">{error}</p>

  if (resumen.length === 0) {
    return (
      <section className="comunicacion-empty" aria-labelledby="equipo-title">
        <span className="comunicacion-empty__icon" aria-hidden="true"><IcUsers size={28} /></span>
        <h3 id="equipo-title">Mensajes del equipo</h3>
        <p>Todavía no hay conversaciones. Abre un galpón desde el panel y escribe el primer mensaje.</p>
      </section>
    )
  }

  return (
    <ul className="comunicacion-hilos" aria-label="Conversaciones por galpón">
      {resumen.map((fila) => (
        <li key={fila.galpon_id}>
          <button
            type="button"
            className="comunicacion-hilo"
            onClick={() => onAbrir(fila.galpon_id, fila.galpon?.nombre ?? `Galpón ${fila.galpon_id}`)}
          >
            <span className="comunicacion-hilo__ident">
              <strong>{fila.galpon?.nombre ?? `Galpón ${fila.galpon_id}`}</strong>
              <span className="comunicacion-hilo__ultimo">
                {fila.ultimo_mensaje ?? 'Sin mensajes'}
              </span>
            </span>
            {fila.sin_leer > 0 && (
              <span className="comunicacion-hilo__badge">{fila.sin_leer}</span>
            )}
            <IcChevronRight size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function Hilo({ galponId, galponNombre, onVolver }: {
  galponId: number
  galponNombre: string
  onVolver?: () => void
}) {
  const { mensajes, cargando, enviando, error, enviar, eliminar } = useHiloEquipo(galponId)
  const [borrador, setBorrador] = useState('')
  const finRef = useRef<HTMLDivElement>(null)
  const usuarioId = getUsuario()?.id ?? null

  // Al llegar un mensaje la conversación baja sola: si no, el nuevo queda
  // fuera de vista y parece que no se envió.
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: 'end' })
  }, [mensajes.length])

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault()
    const texto = borrador
    setBorrador('')
    await enviar(texto)
  }

  function confirmarBorrado(mensaje: MensajeEquipo) {
    if (window.confirm('¿Borrar este mensaje? La conversación sirve como registro.')) {
      void eliminar(mensaje.id)
    }
  }

  return (
    <section className="comunicacion-equipo" aria-label={`Conversación de ${galponNombre}`}>
      <header className="comunicacion-equipo__head">
        {onVolver && (
          <button type="button" className="comunicacion-equipo__volver" onClick={onVolver}>
            ← Conversaciones
          </button>
        )}
        <strong>{galponNombre}</strong>
      </header>

      <div className="comunicacion-equipo__mensajes" aria-live="polite">
        {cargando ? (
          <p className="comunicacion-cargando" role="status">Cargando conversación…</p>
        ) : mensajes.length === 0 ? (
          <p className="comunicacion-ia__welcome">
            Nadie ha escrito aquí todavía. Lo que dejes queda para el turno siguiente.
          </p>
        ) : (
          mensajes.map((mensaje) => {
            const propio = mensaje.emisor_id === usuarioId
            return (
              <article
                key={mensaje.id}
                className={`comunicacion-msg${propio ? ' es-propio' : ''}`}
              >
                {!propio && (
                  <span className="comunicacion-msg__autor">{mensaje.emisor.nombre_completo}</span>
                )}
                <p className="comunicacion-msg__texto">{mensaje.contenido}</p>
                <span className="comunicacion-msg__pie">
                  {hora(mensaje.fecha_envio)}
                  {propio && (
                    <button
                      type="button"
                      className="comunicacion-msg__borrar"
                      onClick={() => confirmarBorrado(mensaje)}
                      aria-label="Borrar mensaje"
                    >
                      Borrar
                    </button>
                  )}
                </span>
              </article>
            )
          })
        )}
        <div ref={finRef} />
      </div>

      {error && <p className="comunicacion-form-error" role="alert">{error}</p>}

      <form className="comunicacion-composer" onSubmit={(e) => void alEnviar(e)}>
        <input
          value={borrador}
          onChange={(evento) => setBorrador(evento.target.value)}
          placeholder="Escribe para el equipo…"
          aria-label="Mensaje para el equipo"
          maxLength={2000}
        />
        <button type="submit" disabled={!borrador.trim() || enviando} aria-label="Enviar mensaje">
          <IcSend size={19} aria-hidden="true" />
        </button>
      </form>
    </section>
  )
}

function PanelEquipo({ galponId, galponNombre }: {
  galponId: number | null
  galponNombre: string | null
}) {
  // Sin galpón en el contexto se elige uno de la lista; con galpón se entra
  // directo a su conversación.
  const [elegido, setElegido] = useState<{ id: number; nombre: string } | null>(null)

  if (galponId !== null) {
    return <Hilo galponId={galponId} galponNombre={galponNombre ?? `Galpón ${galponId}`} />
  }

  if (elegido) {
    return (
      <Hilo
        galponId={elegido.id}
        galponNombre={elegido.nombre}
        onVolver={() => setElegido(null)}
      />
    )
  }

  return <ListaGalpones onAbrir={(id, nombre) => setElegido({ id, nombre })} />
}

export default PanelEquipo
