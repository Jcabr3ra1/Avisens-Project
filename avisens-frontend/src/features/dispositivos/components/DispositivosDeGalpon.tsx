import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useState, type FormEvent } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { mensajeDeError } from '@shared/utils/errores'
import type { Galpon } from '@features/galpones/api/galpones'
import { IcChip, IcPlus, IcTrash } from '@shared/ui/icons/icons'
import { useDispositivos } from '../hooks/useDispositivos'
import {
  FORMULARIO_DISPOSITIVO_INICIAL,
  type DatosDispositivo,
} from '../model/dispositivo'
import { destinoDeLaPagina, provisionarTokenPorUsb, soportaProvisionUsb } from '../model/provisionUsb'
import type { CrearDispositivoPayload, Dispositivo } from '../api/dispositivos'
import './DispositivosDeGalpon.css'

function DispositivosDeGalpon({ galpon, onCambio }: {
  galpon: Pick<Galpon, 'id' | 'codigo' | 'nombre'>
  onCambio?: () => void
}) {
  const { dispositivos, cargando, error, crear, alternar, regenerarToken, eliminar } =
    useDispositivos(galpon.id)
  const puedeGestionar = getRol() === ROL_ADMIN
  const usbDisponible = soportaProvisionUsb()
  const destinoUsb = destinoDeLaPagina()
  const [form, setForm] = useState<DatosDispositivo>(FORMULARIO_DISPOSITIVO_INICIAL)
  const [mostrarOpcionales, setMostrarOpcionales] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [avisoAccion, setAvisoAccion] = useState('')
  const [token, setToken] = useState<{ id: number; valor: string } | null>(null)
  const [enviandoUsb, setEnviandoUsb] = useState(false)
  const [estadoUsb, setEstadoUsb] = useState('')
  const [errorUsb, setErrorUsb] = useState('')
  const [copiado, setCopiado] = useState(false)

  function campo<K extends keyof DatosDispositivo>(k: K, v: DatosDispositivo[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  function limpiarEstadoToken() {
    setToken(null)
    setEstadoUsb('')
    setErrorUsb('')
    setCopiado(false)
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setErrorAccion('')
    limpiarEstadoToken()

    setGuardando(true)
    try {
      const payload: CrearDispositivoPayload = {
        galpon_id: galpon.id,
        version_firmware: form.version_firmware.trim() || undefined,
        ip_local: form.ip_local.trim() || undefined,
      }
      const resultado = await crear(payload)
      setToken({ id: resultado.dispositivo.id, valor: resultado.token_ingesta })
      setForm(FORMULARIO_DISPOSITIVO_INICIAL)
      setMostrarOpcionales(false)
      onCambio?.()
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo registrar el dispositivo.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleAlternar(dispositivo: Dispositivo) {
    setErrorAccion('')
    try {
      await alternar(dispositivo)
      onCambio?.()
    } catch (err) {
      setErrorAccion(
        mensajeDeError(err, 'No se pudo cambiar el estado del dispositivo.'),
      )
    }
  }

  async function handleToken(dispositivo: Dispositivo) {
    const confirmar = await confirmarAccion({
      titulo: '¿Regenerar el token?',
      entidad: dispositivo.nombre,
      descripcion: 'El token anterior deja de servir. El ESP32 no podrá enviar mediciones hasta que lo vuelvas a vincular por USB.',
      textoConfirmar: 'Regenerar token',
      tono: 'aviso',
    })
    if (!confirmar) return
    setErrorAccion('')
    limpiarEstadoToken()
    try {
      const { token_ingesta } = await regenerarToken(dispositivo.id)
      setToken({ id: dispositivo.id, valor: token_ingesta })
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo regenerar el token.'))
    }
  }

  async function handleEnviarUsb() {
    if (!token || enviandoUsb) return
    setEnviandoUsb(true)
    setEstadoUsb('')
    setErrorUsb('')
    try {
      await provisionarTokenPorUsb(token.valor)
      setEstadoUsb(destinoUsb === 'local'
        ? 'ESP32 vinculado a este computador. Ya puedes desconectarlo del USB.'
        : 'ESP32 vinculado a producción. Ya puedes desconectarlo del USB.')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setErrorUsb('No se seleccionó ningún puerto USB.')
      } else if (err instanceof Error && err.message) {
        setErrorUsb(err.message)
      } else {
        setErrorUsb('No se pudo vincular el ESP32. Revisa que esté conectado por USB.')
      }
    } finally {
      setEnviandoUsb(false)
    }
  }

  async function handleCopiarToken() {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token.valor)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  async function handleEliminar(dispositivo: Dispositivo) {
    const confirmar = await confirmarAccion({
      titulo: '¿Eliminar este controlador?',
      entidad: dispositivo.nombre,
      descripcion: 'También se eliminan sus sensores. Dejará de recibir datos y su token queda anulado. Si ya envió lecturas, el historial se conserva para los reportes.',
      textoConfirmar: 'Eliminar controlador',
      tono: 'peligro',
    })
    if (!confirmar) return
    setErrorAccion('')
    setAvisoAccion('')
    try {
      const { retirado } = await eliminar(dispositivo.id)
      setAvisoAccion(retirado
        ? `Se eliminó "${dispositivo.nombre}" con sus sensores. Sus lecturas anteriores se conservan en el historial.`
        : `Se eliminó "${dispositivo.nombre}".`)
      onCambio?.()
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo eliminar el dispositivo.'))
    }
  }

  return (
    <div className="dsp">
      {error && <div className="dsp-alert dsp-alert--error" role="alert">{error}</div>}
      {avisoAccion && (
        <div className="dsp-alert dsp-alert--ok" role="status">{avisoAccion}</div>
      )}
      {errorAccion && (
        <div className="dsp-alert dsp-alert--error" role="alert">{errorAccion}</div>
      )}

      {token && (
        <div className="dsp-token" role="status">
          <strong>Vincular el ESP32 (token único)</strong>
          <code>{token.valor}</code>
          <p>
            Conecta el ESP32 a este computador por USB y pulsa «Vincular ESP32». Queda guardado en su memoria.
            {destinoUsb === 'local'
              ? ' Desde esta página local queda vinculado a este computador.'
              : ' Desde esta página queda vinculado a producción.'}
          </p>
          {estadoUsb && (
            <p className="dsp-token-feedback dsp-token-feedback--ok">{estadoUsb}</p>
          )}
          {errorUsb && (
            <p className="dsp-token-feedback dsp-token-feedback--error" role="alert">{errorUsb}</p>
          )}
          <div className="dsp-token-acciones">
            {usbDisponible && (
              <button
                type="button"
                className="dsp-btn dsp-btn--primary dsp-btn--sm"
                disabled={enviandoUsb}
                onClick={() => void handleEnviarUsb()}
              >
                {enviandoUsb ? 'Vinculando…' : 'Vincular ESP32'}
              </button>
            )}
            <button
              type="button"
              className="dsp-btn dsp-btn--sm"
              onClick={() => void handleCopiarToken()}
            >
              {copiado ? 'Copiado' : 'Copiar token'}
            </button>
            <button
              type="button"
              className="dsp-btn dsp-btn--sm"
              onClick={limpiarEstadoToken}
            >
              Ya quedó listo
            </button>
          </div>
        </div>
      )}

      {puedeGestionar && (
        <form className="dsp-registro" onSubmit={handleCrear}>
          <div className="dsp-registro-top">
            <div>
              <h3 className="dsp-form-titulo">Controladores ESP32</h3>
              <p className="dsp-ayuda">El código y el token de conexión se generan solos para <strong>{galpon.codigo}</strong>.</p>
            </div>
            <div className="dsp-registro-acciones">
              <button
                type="button"
                className="dsp-btn-enlace"
                onClick={() => setMostrarOpcionales((prev) => !prev)}
              >
                {mostrarOpcionales ? 'Ocultar técnicos' : 'Datos opcionales'}
              </button>
              <button type="submit" className="dsp-btn dsp-btn--primary" disabled={guardando}>
                <IcPlus size={15} aria-hidden="true" />
                {guardando ? 'Registrando…' : 'Registrar ESP32'}
              </button>
            </div>
          </div>

          {mostrarOpcionales && (
            <div className="dsp-grid">
              <label className="dsp-campo">
                <span>Firmware <em>(opcional)</em></span>
                <input
                  value={form.version_firmware}
                  onChange={(e) => campo('version_firmware', e.target.value)}
                  placeholder="1.0.3"
                />
              </label>
              <label className="dsp-campo">
                <span>IP local <em>(opcional)</em></span>
                <input
                  value={form.ip_local}
                  onChange={(e) => campo('ip_local', e.target.value)}
                  placeholder="192.168.1.40"
                />
              </label>
            </div>
          )}

          {errorForm && (
            <p className="dsp-alert dsp-alert--error" role="alert">{errorForm}</p>
          )}
        </form>
      )}

      {cargando ? (
        <p className="dsp-empty" role="status">Cargando controladores…</p>
      ) : dispositivos.length === 0 ? (
        <div className="dsp-vacio">
          <p className="dsp-vacio-titulo">Este galpón aún no tiene controladores.</p>
          {puedeGestionar && (
            <p className="dsp-vacio-sub">
              Pulsa «Registrar ESP32» arriba para crear el primer controlador y obtener su token de conexión.
            </p>
          )}
        </div>
      ) : (
        <ul className="dsp-lista" aria-label="Controladores registrados">
          {dispositivos.map((dispositivo) => (
            <li key={dispositivo.id} className={`dsp-item${dispositivo.activo ? '' : ' is-inactive'}`}>
              <div className="dsp-item-cabecera">
                <span className="dsp-item-icono" aria-hidden="true"><IcChip size={17} /></span>
                <div className="dsp-item-info">
                  <strong>{dispositivo.nombre}</strong>
                  <div className="dsp-item-meta">
                    <code>{dispositivo.codigo_topic}</code>
                    <span>Firmware {dispositivo.version_firmware ? `v${dispositivo.version_firmware}` : 'sin reportar'}</span>
                  </div>
                </div>
                <span className={`dsp-badge dsp-badge--${dispositivo.activo ? 'activo' : 'inactivo'}`}>
                  {dispositivo.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {puedeGestionar && (
                <div className="dsp-item-pie">
                  <button
                    type="button"
                    className="dsp-btn dsp-btn--sm"
                    onClick={() => void handleToken(dispositivo)}
                  >
                    Regenerar token
                  </button>
                  <button
                    type="button"
                    className="dsp-btn dsp-btn--sm"
                    onClick={() => void handleAlternar(dispositivo)}
                  >
                    {dispositivo.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    className="dsp-btn dsp-btn--sm dsp-btn--danger"
                    onClick={() => void handleEliminar(dispositivo)}
                    aria-label={`Eliminar ${dispositivo.nombre}`}
                  >
                    <IcTrash size={14} aria-hidden="true" />
                    Eliminar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default DispositivosDeGalpon
