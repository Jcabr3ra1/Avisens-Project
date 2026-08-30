import { useState, type FormEvent } from 'react'
import { getRol, type CrearSensorPayload, type Sensor } from '@shared/api'
import { mensajeDeError } from '@shared/utils/errores'
import { useSensores } from './hooks/useSensores'
import { SENSOR_TIPOS } from './model/sensor'
import { MedicionesVivas } from './components/MedicionesVivas'
import './SensoresPage.css'

// Página de PRUEBA del backend de sensores (EP-08). Pensada para que el equipo
// verifique en vivo el CRUD real contra la API: registrar, listar, activar,
// desactivar y eliminar. No es el dashboard de monitoreo (ese usa mock).

// El form pide galpon_id y dispositivo_id como números crudos: el equipo conoce
// los IDs de su seed. El backend valida que el dispositivo pertenezca al galpón.
const FORM_INICIAL: CrearSensorPayload = {
  galpon_id: 1,
  dispositivo_id: 1,
  codigo: '',
  tipo: 'temperatura',
  unidad_medida: '°C',
  modelo: '',
  fabricante: '',
}

function SensoresPage() {
  const { sensores, cargando, error, crear, alternar, eliminar, recargar } =
    useSensores()
  const [form, setForm] = useState<CrearSensorPayload>(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [ok, setOk] = useState('')

  const rol = getRol()

  function campo<K extends keyof CrearSensorPayload>(
    k: K,
    v: CrearSensorPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setOk('')
    setGuardando(true)
    try {
      // Los opcionales vacíos no se mandan.
      const payload: CrearSensorPayload = {
        galpon_id: Number(form.galpon_id),
        dispositivo_id: Number(form.dispositivo_id),
        codigo: form.codigo.trim(),
        tipo: form.tipo.trim(),
        unidad_medida: form.unidad_medida.trim(),
        modelo: form.modelo?.trim() || undefined,
        fabricante: form.fabricante?.trim() || undefined,
      }
      const creado = await crear(payload)
      setOk(`Sensor "${creado.codigo}" creado (id ${creado.id}).`)
      setForm((prev) => ({ ...prev, codigo: '' })) // limpia solo el código
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo crear el sensor.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggle(s: Sensor) {
    setErrorAccion('')
    try {
      await alternar(s)
    } catch (err) {
      setErrorAccion(
        mensajeDeError(err, 'No se pudo cambiar el estado del sensor.'),
      )
    }
  }

  async function handleEliminar(s: Sensor) {
    const confirmar = window.confirm(
      `¿Eliminar PERMANENTEMENTE el sensor "${s.codigo}"?\n` +
        'Falla si ya tiene mediciones asociadas. Esta acción no se deshace.',
    )
    if (!confirmar) return
    setErrorAccion('')
    try {
      await eliminar(s.id)
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo eliminar el sensor.'))
    }
  }

  const activos = sensores.filter((s) => s.estado === 'activo').length

  return (
    <div className="page-container sensores">
      <header className="sensores-head">
        <div>
          <h1 className="sensores-title">Sensores · prueba de API</h1>
          <p className="sensores-sub">
            CRUD real contra el backend <code>/sensores</code>. Sesión:{' '}
            <strong>{rol ?? 'sin rol'}</strong>.
          </p>
        </div>
        <button
          className="sn-btn"
          onClick={() => void recargar()}
          disabled={cargando}
        >
          {cargando ? 'Cargando…' : '↻ Recargar'}
        </button>
      </header>

      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      <div className="sensores-resumen">
        <div className="sn-stat">
          <span className="sn-stat-valor">{sensores.length}</span>
          <span className="sn-stat-label">Total</span>
        </div>
        <div className="sn-stat sn-stat--activo">
          <span className="sn-stat-valor">{activos}</span>
          <span className="sn-stat-label">Activos</span>
        </div>
        <div className="sn-stat">
          <span className="sn-stat-valor">{sensores.length - activos}</span>
          <span className="sn-stat-label">Inactivos</span>
        </div>
      </div>

      {error && (
        <div className="sn-alert sn-alert--error" role="alert">
          {error}
        </div>
      )}
      {errorAccion && (
        <div className="sn-alert sn-alert--error" role="alert">
          {errorAccion}
        </div>
      )}

      {/* ── Alta de sensor ──────────────────────────────────────────────── */}
      <form className="sn-card sn-form" onSubmit={handleCrear}>
        <h2 className="sn-form-titulo">Registrar sensor</h2>
        <div className="sn-grid">
          <label className="sn-campo">
            <span>galpon_id</span>
            <input
              type="number"
              min={1}
              value={form.galpon_id}
              onChange={(e) => campo('galpon_id', Number(e.target.value))}
              required
            />
          </label>
          <label className="sn-campo">
            <span>dispositivo_id</span>
            <input
              type="number"
              min={1}
              value={form.dispositivo_id}
              onChange={(e) => campo('dispositivo_id', Number(e.target.value))}
              required
            />
          </label>
          <label className="sn-campo">
            <span>código único</span>
            <input
              value={form.codigo}
              onChange={(e) => campo('codigo', e.target.value)}
              placeholder="TEMP-G1-01"
              required
            />
          </label>
          <label className="sn-campo">
            <span>tipo</span>
            <input
              list="tipos-sensor"
              value={form.tipo}
              onChange={(e) => campo('tipo', e.target.value)}
              required
            />
            <datalist id="tipos-sensor">
              {SENSOR_TIPOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="sn-campo">
            <span>unidad</span>
            <input
              value={form.unidad_medida}
              onChange={(e) => campo('unidad_medida', e.target.value)}
              placeholder="°C"
              required
            />
          </label>
          <label className="sn-campo">
            <span>
              modelo <em>(opcional)</em>
            </span>
            <input
              value={form.modelo}
              onChange={(e) => campo('modelo', e.target.value)}
              placeholder="DHT22"
            />
          </label>
          <label className="sn-campo">
            <span>
              fabricante <em>(opcional)</em>
            </span>
            <input
              value={form.fabricante}
              onChange={(e) => campo('fabricante', e.target.value)}
              placeholder="Aosong"
            />
          </label>
        </div>

        {errorForm && (
          <p className="sn-alert sn-alert--error" role="alert">
            {errorForm}
          </p>
        )}
        {ok && (
          <p className="sn-alert sn-alert--ok" role="status">
            {ok}
          </p>
        )}

        <div className="sn-form-acciones">
          <button type="submit" className="sn-btn sn-btn--primary" disabled={guardando}>
            {guardando ? 'Registrando…' : '+ Registrar sensor'}
          </button>
        </div>
      </form>

      {/* ── Listado ─────────────────────────────────────────────────────── */}
      <div className="sn-card">
        {cargando ? (
          <p className="sn-empty">Cargando sensores…</p>
        ) : sensores.length === 0 ? (
          <div className="sn-vacio">
            <p className="sn-vacio-titulo">No hay sensores registrados.</p>
            <p className="sn-vacio-sub">Crea el primero con el formulario de arriba.</p>
          </div>
        ) : (
          <div className="sn-tabla-scroll">
            <table className="sn-tabla">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Código</th>
                  <th>Tipo</th>
                  <th>Unidad</th>
                  <th>Galpón</th>
                  <th>Dispositivo</th>
                  <th>Estado</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {sensores.map((s) => (
                  <tr key={s.id} className={s.estado === 'activo' ? '' : 'is-inactive'}>
                    <td>{s.id}</td>
                    <td>
                      <code>{s.codigo}</code>
                    </td>
                    <td>{s.tipo}</td>
                    <td>{s.unidad_medida}</td>
                    <td>{s.galpon.nombre}</td>
                    <td>{s.dispositivo.nombre}</td>
                    <td>
                      <span className={`sn-badge sn-badge--${s.estado}`}>{s.estado}</span>
                    </td>
                    <td className="sn-acciones">
                      <button className="sn-btn sn-btn--sm" onClick={() => handleToggle(s)}>
                        {s.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="sn-btn sn-btn--sm sn-btn--danger"
                        onClick={() => handleEliminar(s)}
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

      {/* ── Mediciones en vivo (ESP32 → /ingest → backend) ──────────────── */}
      <MedicionesVivas sensores={sensores} />
    </div>
  )
}

export default SensoresPage
