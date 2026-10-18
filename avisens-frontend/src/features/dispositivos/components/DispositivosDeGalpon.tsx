import { useState, type FormEvent } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { mensajeDeError } from '@shared/utils/errores'
import type { Galpon } from '@features/galpones/api/galpones'
import { useDispositivos } from '../hooks/useDispositivos'
import {
  FORMULARIO_DISPOSITIVO_INICIAL,
  type DatosDispositivo,
} from '../model/dispositivo'
import type { CrearDispositivoPayload, Dispositivo } from '../api/dispositivos'
import './DispositivosDeGalpon.css'

function DispositivosDeGalpon({ galpon, onCambio }: {
  galpon: Pick<Galpon, 'id' | 'codigo' | 'nombre'>
  onCambio?: () => void
}) {
  const { dispositivos, cargando, error, crear, alternar, regenerarToken, eliminar } =
    useDispositivos(galpon.id)
  // La administración de nodos ESP32 pertenece exclusivamente al administrador.
  const puedeGestionar = getRol() === ROL_ADMIN
  const conAcciones = puedeGestionar
  const [form, setForm] = useState<DatosDispositivo>(FORMULARIO_DISPOSITIVO_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [token, setToken] = useState<{ id: number; valor: string } | null>(null)

  function campo<K extends keyof DatosDispositivo>(k: K, v: DatosDispositivo[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setErrorAccion('')
    setToken(null)

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
    const confirmar = window.confirm(
      `¿Regenerar el token de "${dispositivo.nombre}"?\n` +
        'El token anterior deja de servir: el ESP32 no podrá enviar mediciones ' +
        'hasta que lo actualices en su firmware.',
    )
    if (!confirmar) return
    setErrorAccion('')
    try {
      const { token_ingesta } = await regenerarToken(dispositivo.id)
      setToken({ id: dispositivo.id, valor: token_ingesta })
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo regenerar el token.'))
    }
  }

  async function handleEliminar(dispositivo: Dispositivo) {
    const confirmar = window.confirm(
      `¿Eliminar PERMANENTEMENTE el dispositivo "${dispositivo.nombre}"?\n` +
        'Falla si ya tiene sensores asociados. Esta acción no se deshace.',
    )
    if (!confirmar) return
    setErrorAccion('')
    try {
      await eliminar(dispositivo.id)
      onCambio?.()
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo eliminar el dispositivo.'))
    }
  }

  const activos = dispositivos.filter((d) => d.activo).length

  return (
    <div className="dsp">
      <div className="dsp-resumen">
        <div className="dsp-stat">
          <span className="dsp-stat-valor">{dispositivos.length}</span>
          <span className="dsp-stat-label">Total</span>
        </div>
        <div className="dsp-stat dsp-stat--activo">
          <span className="dsp-stat-valor">{activos}</span>
          <span className="dsp-stat-label">Activos</span>
        </div>
        <div className="dsp-stat">
          <span className="dsp-stat-valor">{dispositivos.length - activos}</span>
          <span className="dsp-stat-label">Inactivos</span>
        </div>
      </div>

      {error && <div className="dsp-alert dsp-alert--error" role="alert">{error}</div>}
      {errorAccion && (
        <div className="dsp-alert dsp-alert--error" role="alert">{errorAccion}</div>
      )}

      {token && (
        <div className="dsp-token" role="status">
          <strong>Token nuevo</strong>
          <code>{token.valor}</code>
          <p>
            Cópialo ahora y ponlo en el firmware del ESP32. No se vuelve a
            mostrar.
          </p>
          <button type="button" className="dsp-btn dsp-btn--sm" onClick={() => setToken(null)}>
            Ya lo copié
          </button>
        </div>
      )}

      {puedeGestionar && (
      <form className="dsp-card dsp-form" onSubmit={handleCrear}>
        <h3 className="dsp-form-titulo">Registrar controlador ESP32</h3>
        <p className="dsp-ayuda">El nombre y el código se generan automáticamente con el código del galpón y un consecutivo: ESP32-001, ESP32-002… Al registrar el controlador recibirás su token de conexión una sola vez.</p>
        <details className="dsp-opcionales">
          <summary>Datos técnicos opcionales</summary>
          <div className="dsp-grid">
          <label className="dsp-campo">
            <span>firmware <em>(opcional)</em></span>
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
        </details>

        {errorForm && (
          <p className="dsp-alert dsp-alert--error" role="alert">{errorForm}</p>
        )}

        <div className="dsp-form-acciones">
          <button type="submit" className="dsp-btn dsp-btn--primary" disabled={guardando}>
            {guardando ? 'Registrando…' : '+ Registrar dispositivo'}
          </button>
        </div>
      </form>
      )}

      <div className="dsp-card">
        {cargando ? (
          <p className="dsp-empty">Cargando dispositivos…</p>
        ) : dispositivos.length === 0 ? (
          <div className="dsp-vacio">
            <p className="dsp-vacio-titulo">Este galpón no tiene dispositivos.</p>
            {puedeGestionar && (
              <p className="dsp-vacio-sub">
                Registra el nodo y guarda el token. Después asígnale las
                variables que reportará desde el catálogo de sensores.
              </p>
            )}
          </div>
        ) : (
          <div className="dsp-tabla-scroll">
            <table className="dsp-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código del controlador</th>
                  <th>Firmware</th>
                  <th>Estado</th>
                  {conAcciones && <th aria-label="Acciones"></th>}
                </tr>
              </thead>
              <tbody>
                {dispositivos.map((dispositivo) => (
                  <tr key={dispositivo.id} className={dispositivo.activo ? '' : 'is-inactive'}>
                    <td>{dispositivo.nombre}</td>
                    <td><code>{dispositivo.codigo_topic}</code></td>
                    <td>{dispositivo.version_firmware ?? '—'}</td>
                    <td>
                      <span
                        className={`dsp-badge dsp-badge--${dispositivo.activo ? 'activo' : 'inactivo'}`}
                      >
                        {dispositivo.activo ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    {conAcciones && (
                    <td className="dsp-acciones">
                      {puedeGestionar && (
                        <>
                          <button
                            className="dsp-btn dsp-btn--sm"
                            onClick={() => void handleAlternar(dispositivo)}
                          >
                            {dispositivo.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            className="dsp-btn dsp-btn--sm"
                            onClick={() => void handleToken(dispositivo)}
                          >
                            Token
                          </button>
                        </>
                      )}
                      {puedeGestionar && (
                        <button
                          className="dsp-btn dsp-btn--sm dsp-btn--danger"
                          onClick={() => void handleEliminar(dispositivo)}
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default DispositivosDeGalpon
