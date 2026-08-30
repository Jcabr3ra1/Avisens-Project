import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import {
  listarSensores,
  listarDispositivos,
  crearSensor,
  activarSensor,
  desactivarSensor,
  eliminarSensor,
  type Dispositivo,
  type Sensor,
  type CrearSensorPayload,
} from '@shared/api'
import type { Galpon } from '@features/galpones/api/galpones'
import { MedicionesVivas } from './MedicionesVivas'
import './SensoresPage.css'

const TIPOS = ['temperatura', 'humedad', 'co2', 'nh3', 'luz']

function mensajeError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response) {
    if (err.response.status === 403) {
      return 'No tienes permisos para esta acción.'
    }
    const data = err.response.data as { message?: string | string[] }
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
  }
  return fallback
}

function SensoresDeGalpon({ galpon }: { galpon: Galpon }) {
  const [sensores, setSensores] = useState<Sensor[]>([])
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    codigo: '',
    tipo: 'temperatura',
    unidad_medida: '°C',
    modelo: '',
    fabricante: '',
  })
  const [dispositivoId, setDispositivoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [ok, setOk] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const [todos, dispositivosTodos] = await Promise.all([
        listarSensores(),
        listarDispositivos(),
      ])
      setSensores(todos.filter((s) => s.galpon.id === galpon.id))
      setDispositivos(
        dispositivosTodos.filter((d) => d.galpon.id === galpon.id && d.activo),
      )
    } catch (err) {
      setError(mensajeError(err, 'No se pudieron cargar los sensores.'))
    } finally {
      setCargando(false)
    }
  }, [galpon.id])

  useEffect(() => {
    void cargar()
  }, [cargar])

  function campo<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setOk('')
    if (!dispositivoId) {
      setErrorForm('Selecciona el dispositivo al que pertenece el sensor.')
      return
    }
    setGuardando(true)
    try {
      const payload: CrearSensorPayload = {
        galpon_id: galpon.id,
        dispositivo_id: Number(dispositivoId),
        codigo: form.codigo.trim(),
        tipo: form.tipo.trim(),
        unidad_medida: form.unidad_medida.trim(),
        modelo: form.modelo.trim() || undefined,
        fabricante: form.fabricante.trim() || undefined,
      }
      const creado = await crearSensor(payload)
      setOk(`Sensor "${creado.codigo}" creado.`)
      setForm((prev) => ({ ...prev, codigo: '' }))
      await cargar()
    } catch (err) {
      setErrorForm(mensajeError(err, 'No se pudo crear el sensor.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleToggle(s: Sensor) {
    setError('')
    try {
      if (s.estado === 'activo') {
        await desactivarSensor(s.id)
      } else {
        await activarSensor(s.id)
      }
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo cambiar el estado del sensor.'))
    }
  }

  async function handleEliminar(s: Sensor) {
    const confirmar = window.confirm(
      `¿Eliminar PERMANENTEMENTE el sensor "${s.codigo}"?\n` +
        'Falla si ya tiene mediciones asociadas. Esta acción no se deshace.',
    )
    if (!confirmar) return
    setError('')
    try {
      await eliminarSensor(s.id)
      await cargar()
    } catch (err) {
      setError(mensajeError(err, 'No se pudo eliminar el sensor.'))
    }
  }

  const activos = sensores.filter((s) => s.estado === 'activo').length

  return (
    <div className="sensores">
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

      <form className="sn-card sn-form" onSubmit={handleCrear}>
        <h2 className="sn-form-titulo">Registrar sensor</h2>
        <div className="sn-grid">
          <label className="sn-campo">
            <span>galpón</span>
            <input value={`${galpon.codigo} · ${galpon.nombre}`} disabled />
          </label>
          <label className="sn-campo">
            <span>dispositivo</span>
            <select
              value={dispositivoId}
              onChange={(e) => setDispositivoId(e.target.value)}
              required
            >
              <option value="">Selecciona un dispositivo</option>
              {dispositivos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
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
              list="tipos-sensor-galpon"
              value={form.tipo}
              onChange={(e) => campo('tipo', e.target.value)}
              required
            />
            <datalist id="tipos-sensor-galpon">
              {TIPOS.map((t) => (
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

        {dispositivos.length === 0 && (
          <p className="sn-empty">
            Este galpón no tiene dispositivos activos: regístralos antes de
            crear sensores.
          </p>
        )}
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
          <button
            type="submit"
            className="sn-btn sn-btn--primary"
            disabled={guardando || dispositivos.length === 0}
          >
            {guardando ? 'Registrando…' : '+ Registrar sensor'}
          </button>
        </div>
      </form>

      <div className="sn-card">
        {cargando ? (
          <p className="sn-empty">Cargando sensores…</p>
        ) : sensores.length === 0 ? (
          <div className="sn-vacio">
            <p className="sn-vacio-titulo">
              Este galpón no tiene sensores registrados.
            </p>
            <p className="sn-vacio-sub">
              Crea el primero con el formulario de arriba.
            </p>
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
                  <th>Dispositivo</th>
                  <th>Estado</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {sensores.map((s) => (
                  <tr
                    key={s.id}
                    className={s.estado === 'activo' ? '' : 'is-inactive'}
                  >
                    <td>{s.id}</td>
                    <td>
                      <code>{s.codigo}</code>
                    </td>
                    <td>{s.tipo}</td>
                    <td>{s.unidad_medida}</td>
                    <td>{s.dispositivo.nombre}</td>
                    <td>
                      <span className={`sn-badge sn-badge--${s.estado}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="sn-acciones">
                      <button
                        className="sn-btn sn-btn--sm"
                        onClick={() => handleToggle(s)}
                      >
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

      <MedicionesVivas sensores={sensores} />
    </div>
  )
}

export default SensoresDeGalpon
