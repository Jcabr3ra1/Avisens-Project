import { useState, type FormEvent } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type { Galpon } from '@features/galpones/api/galpones'
import { useDispositivos } from '../hooks/useDispositivos'
import {
  esMacValida,
  FORMULARIO_DISPOSITIVO_INICIAL,
  type DatosDispositivo,
} from '../model/dispositivo'
import type { CrearDispositivoPayload, Dispositivo } from '../api/dispositivos'
import './DispositivosDeGalpon.css'

function DispositivosDeGalpon({ galpon }: { galpon: Galpon }) {
  const { dispositivos, cargando, error, crear, alternar, regenerarToken, eliminar } =
    useDispositivos(galpon.id)
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

    if (!esMacValida(form.mac_address)) {
      setErrorForm('La MAC debe tener el formato AA:BB:CC:DD:EE:FF.')
      return
    }

    setGuardando(true)
    try {
      const payload: CrearDispositivoPayload = {
        galpon_id: galpon.id,
        mac_address: form.mac_address.trim(),
        codigo_topic: form.codigo_topic.trim(),
        nombre: form.nombre.trim(),
        version_firmware: form.version_firmware.trim() || undefined,
        ip_local: form.ip_local.trim() || undefined,
      }
      await crear(payload)
      setForm(FORMULARIO_DISPOSITIVO_INICIAL)
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

      <form className="dsp-card dsp-form" onSubmit={handleCrear}>
        <h2 className="dsp-form-titulo">Registrar dispositivo</h2>
        <div className="dsp-grid">
          <label className="dsp-campo">
            <span>galpón</span>
            <input value={`${galpon.codigo} · ${galpon.nombre}`} disabled />
          </label>
          <label className="dsp-campo">
            <span>nombre</span>
            <input
              value={form.nombre}
              onChange={(e) => campo('nombre', e.target.value)}
              placeholder="ESP32 galpón 1"
              required
            />
          </label>
          <label className="dsp-campo">
            <span>MAC</span>
            <input
              value={form.mac_address}
              onChange={(e) => campo('mac_address', e.target.value)}
              placeholder="A4:CF:12:9B:00:1E"
              required
            />
          </label>
          <label className="dsp-campo">
            <span>tópico MQTT</span>
            <input
              value={form.codigo_topic}
              onChange={(e) => campo('codigo_topic', e.target.value)}
              placeholder="galpon-1"
              required
            />
          </label>
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

        {errorForm && (
          <p className="dsp-alert dsp-alert--error" role="alert">{errorForm}</p>
        )}

        <div className="dsp-form-acciones">
          <button type="submit" className="dsp-btn dsp-btn--primary" disabled={guardando}>
            {guardando ? 'Registrando…' : '+ Registrar dispositivo'}
          </button>
        </div>
      </form>

      <div className="dsp-card">
        {cargando ? (
          <p className="dsp-empty">Cargando dispositivos…</p>
        ) : dispositivos.length === 0 ? (
          <div className="dsp-vacio">
            <p className="dsp-vacio-titulo">Este galpón no tiene dispositivos.</p>
            <p className="dsp-vacio-sub">
              Registra el primero arriba: sin dispositivo no se pueden crear
              sensores.
            </p>
          </div>
        ) : (
          <div className="dsp-tabla-scroll">
            <table className="dsp-tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>MAC</th>
                  <th>Tópico</th>
                  <th>Firmware</th>
                  <th>Estado</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {dispositivos.map((dispositivo) => (
                  <tr key={dispositivo.id} className={dispositivo.activo ? '' : 'is-inactive'}>
                    <td>{dispositivo.nombre}</td>
                    <td><code>{dispositivo.mac_address}</code></td>
                    <td><code>{dispositivo.codigo_topic}</code></td>
                    <td>{dispositivo.version_firmware ?? '—'}</td>
                    <td>
                      <span
                        className={`dsp-badge dsp-badge--${dispositivo.activo ? 'activo' : 'inactivo'}`}
                      >
                        {dispositivo.activo ? 'activo' : 'inactivo'}
                      </span>
                    </td>
                    <td className="dsp-acciones">
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
                      <button
                        className="dsp-btn dsp-btn--sm dsp-btn--danger"
                        onClick={() => void handleEliminar(dispositivo)}
                      >
                        Eliminar
                      </button>
                    </td>
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
