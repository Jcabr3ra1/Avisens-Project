import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import type { Usuario } from '@shared/api'
import Modal from '@shared/ui/Modal/Modal'
import { IcCheck, IcRefresh } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import {
  restablecerPasswordUsuario,
  type ResultadoRestablecerPassword,
} from '../api/usuarios'

type Props = {
  usuario: Usuario
  onCerrar: () => void
}

function ModalRestablecerPassword({ usuario, onCerrar }: Props) {
  const esOperario = usuario.rol.nombre === 'Operario'
  const [modo, setModo] = useState<'auto' | 'manual'>(esOperario ? 'manual' : 'auto')
  const [manual, setManual] = useState('')
  const [observacion, setObservacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ResultadoRestablecerPassword | null>(null)
  const [copiada, setCopiada] = useState(false)

  async function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (modo === 'manual' && manual.trim().length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      const respuesta = await restablecerPasswordUsuario(usuario.id, {
        nueva_password: modo === 'manual' ? manual.trim() : undefined,
        observacion: observacion.trim() || undefined,
      })
      setResultado(respuesta)
      toast.success(
        esOperario
          ? `Contraseña actualizada para ${usuario.nombre_completo}`
          : `Contraseña temporal generada para ${usuario.nombre_completo}`,
      )
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo actualizar la contraseña.'))
    } finally {
      setGuardando(false)
    }
  }

  async function copiarPassword() {
    if (!resultado) return
    try {
      await navigator.clipboard.writeText(resultado.password_temporal)
      setCopiada(true)
      toast.success('Contraseña copiada al portapapeles')
      setTimeout(() => setCopiada(false), 2500)
    } catch {
      toast.error('No se pudo copiar automáticamente; selecciónala manualmente.')
    }
  }

  return (
    <Modal
      variante="lateral"
      titulo={esOperario ? 'Cambiar contraseña del operario' : 'Restablecer contraseña'}
      subtitulo={`${usuario.nombre_completo} · @${usuario.username}`}
      onCerrar={() => !guardando && onCerrar()}
    >
      {resultado ? (
        <div className="usr-reset-resultado">
          <div className="usr-reset-exito">
            <span className="usr-reset-icono" aria-hidden="true">
              <IcCheck size={18} />
            </span>
            <div>
              <strong>{resultado.debe_cambiar_password ? 'Contraseña temporal lista' : 'Contraseña actualizada'}</strong>
              <p>
                {resultado.debe_cambiar_password
                  ? `Se cerraron las sesiones activas de ${usuario.nombre_completo}. Al iniciar sesión con esta clave deberá definir una nueva contraseña personal.`
                  : `Se cerraron las sesiones activas de ${usuario.nombre_completo}. Ya puede ingresar directamente con esta nueva contraseña.`}
              </p>
            </div>
          </div>

          <div className="usr-reset-clave-caja">
            <span className="usr-reset-clave-label">
              {resultado.debe_cambiar_password ? 'Contraseña temporal (válida 24 h)' : 'Nueva contraseña asignada'}
            </span>
            <code className="usr-reset-clave-valor">{resultado.password_temporal}</code>
            <button
              type="button"
              className="adm-btn adm-btn--primario"
              onClick={() => void copiarPassword()}
            >
              {copiada ? 'Copiada al portapapeles' : 'Copiar contraseña'}
            </button>
          </div>

          <p className="usr-reset-aviso">{resultado.aviso}</p>

          <div className="modal-pie">
            <button type="button" className="adm-btn adm-btn--secundario" onClick={onCerrar}>
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <form className="modal-form" onSubmit={(e) => void manejarEnvio(e)}>
          <p className="usr-reset-intro">
            {esOperario
              ? 'El operario no puede cambiar su propia contraseña. Define aquí su nueva clave (o genera una automática) y compártesela; sus sesiones activas se cerrarán de inmediato.'
              : 'Al restablecer la contraseña se cerrarán las sesiones activas del usuario y deberá elegir una clave definitiva en su próximo ingreso.'}
          </p>

          <fieldset className="modal-campo">
            <legend>{esOperario ? 'Cómo definir la contraseña' : 'Tipo de contraseña temporal'}</legend>
            <div className="usr-reset-modos">
              <label className={`usr-reset-modo${modo === 'manual' ? ' is-activo' : ''}`}>
                <input
                  type="radio"
                  name="modo-reset"
                  checked={modo === 'manual'}
                  onChange={() => { setModo('manual'); setError('') }}
                />
                <span>
                  <strong>Definir manualmente</strong>
                  <small>Escribe tú la nueva contraseña (mínimo 8 caracteres)</small>
                </span>
              </label>

              <label className={`usr-reset-modo${modo === 'auto' ? ' is-activo' : ''}`}>
                <input
                  type="radio"
                  name="modo-reset"
                  checked={modo === 'auto'}
                  onChange={() => { setModo('auto'); setError('') }}
                />
                <span>
                  <strong>Generar automáticamente</strong>
                  <small>Clave aleatoria segura lista para copiar</small>
                </span>
              </label>
            </div>
          </fieldset>

          {modo === 'manual' && (
            <label className="modal-campo">
              <span>Nueva contraseña</span>
              <input
                type="text"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                minLength={8}
                maxLength={72}
                placeholder="Mínimo 8 caracteres"
                autoComplete="off"
                required
              />
            </label>
          )}

          <label className="modal-campo">
            <span>Observación <small>(opcional)</small></span>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              maxLength={250}
              placeholder="Ej.: Solicitada por el operario en turno de mañana"
            />
          </label>

          {error && <p className="modal-error" role="alert">{error}</p>}

          <div className="modal-pie">
            <button
              type="button"
              className="adm-btn adm-btn--secundario"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="adm-btn adm-btn--primario"
              disabled={guardando}
            >
              <IcRefresh size={15} aria-hidden="true" />
              {guardando
                ? 'Guardando…'
                : esOperario
                  ? 'Guardar nueva contraseña'
                  : 'Generar contraseña temporal'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

export default ModalRestablecerPassword
