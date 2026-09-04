import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Usuario } from '@shared/api'
import type {
  AprobacionRecuperacion,
  RecuperacionPassword,
} from '../model/recuperacionPassword'
import { useRecuperacionesDeUsuario } from '../hooks/useRecuperacionesDeUsuario'
import '../RecuperacionesPassword.css'

function fecha(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(valor))
}

function RecuperacionesDeUsuario({ usuario }: { usuario: Usuario }) {
  const { solicitudes, cargando, error, aprobar, rechazar } =
    useRecuperacionesDeUsuario(usuario.id)
  const [observacion, setObservacion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [credencial, setCredencial] = useState<AprobacionRecuperacion | null>(
    null,
  )

  const pendiente = solicitudes.find(
    (solicitud: RecuperacionPassword) => solicitud.estado === 'pendiente',
  )
  const historial = solicitudes.filter(
    (solicitud) => solicitud.estado !== 'pendiente',
  )

  const gestionar = async (accion: 'aprobar' | 'rechazar') => {
    if (!pendiente) return
    setProcesando(true)
    try {
      const datos = { observacion: observacion.trim() || undefined }
      if (accion === 'aprobar') {
        setCredencial(await aprobar(pendiente.id, datos))
      } else {
        await rechazar(pendiente.id, datos)
      }
      setObservacion('')
    } catch {
      toast.error('No se pudo procesar la solicitud', {
        description: 'Verifica que la solicitud siga pendiente.',
      })
    } finally {
      setProcesando(false)
    }
  }

  const copiar = async () => {
    if (!credencial) return
    await navigator.clipboard.writeText(credencial.password_temporal)
    toast.success('Contraseña copiada al portapapeles')
  }

  const enviar = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void gestionar('aprobar')
  }

  return (
    <div>
      {error && (
        <p className="rec-aviso rec-aviso--error" role="alert">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="rec-cargando" role="status">
          Cargando solicitudes…
        </p>
      ) : (
        <>
          {credencial && (
            <section className="rec-credencial" aria-live="polite">
              <p>Contraseña temporal</p>
              <strong>{credencial.password_temporal}</strong>
              <span>
                Vence {fecha(credencial.expira_en)}. Muéstrala una sola vez y
                compártela mediante un canal seguro.
              </span>
              <button
                className="rec-boton rec-boton--secundario"
                type="button"
                onClick={() => void copiar()}
              >
                Copiar contraseña
              </button>
            </section>
          )}

          {pendiente ? (
            <form
              className="rec-form-gestion"
              onSubmit={(event) => void enviar(event)}
            >
              <p className="rec-kicker">
                Solicitud #{pendiente.id} · recibida {fecha(pendiente.fecha_creacion)}
              </p>
              <dl className="rec-datos">
                <div>
                  <dt>Motivo</dt>
                  <dd>{pendiente.motivo || 'No indicó un motivo.'}</dd>
                </div>
              </dl>
              <label className="rec-campo" htmlFor="rec-observacion-hija">
                <span>
                  Nota de verificación <em>Opcional</em>
                </span>
                <textarea
                  id="rec-observacion-hija"
                  value={observacion}
                  onChange={(event) => setObservacion(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Por ejemplo: identidad confirmada por llamada."
                />
              </label>
              <p className="rec-ayuda">
                Al restablecer se cerrarán las sesiones activas y la persona
                deberá definir una contraseña nueva al ingresar.
              </p>
              <div className="rec-panel-acciones">
                <button
                  className="rec-boton rec-boton--peligro"
                  type="button"
                  onClick={() => void gestionar('rechazar')}
                  disabled={procesando}
                >
                  Rechazar
                </button>
                <button
                  className="rec-boton rec-boton--principal"
                  type="submit"
                  disabled={procesando}
                >
                  {procesando ? 'Generando acceso…' : 'Restablecer acceso'}
                </button>
              </div>
            </form>
          ) : !credencial && historial.length === 0 ? (
            <p className="rec-vacio">
              Este usuario no tiene solicitudes de recuperación.
            </p>
          ) : null}

          {historial.length > 0 && (
            <div className="rec-listado">
              <p className="rec-kicker">Historial</p>
              {historial.map((solicitud) => (
                <div key={solicitud.id} className="rec-detalle-final">
                  <p>
                    <span className={`rec-estado rec-estado--${solicitud.estado}`}>
                      {solicitud.estado}
                    </span>
                    <strong> Solicitud #{solicitud.id}</strong> ·{' '}
                    {fecha(solicitud.fecha_creacion)}
                  </p>
                  {solicitud.atendida_por && (
                    <p>
                      Atendida por:{' '}
                      <strong>{solicitud.atendida_por.nombre_completo}</strong>
                    </p>
                  )}
                  {solicitud.observacion && <p>Nota: {solicitud.observacion}</p>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RecuperacionesDeUsuario
