import { useEffect, useState, type FormEvent } from 'react'
import { type CrearSensorPayload, type Sensor } from '@features/sensores/api/sensores'
import {
  listarDispositivos,
  type Dispositivo,
} from '@features/dispositivos/api/dispositivos'
import { mensajeDeError } from '@shared/utils/errores'
import type { Galpon } from '@features/galpones/api/galpones'
import { useCatalogoSensores } from '../hooks/useCatalogoSensores'
import { useSensores } from '../hooks/useSensores'
import {
  FORMULARIO_SENSOR_INICIAL,
  type DatosSensor,
} from '../model/sensor'
import { MedicionesVivas } from './MedicionesVivas'
import '../SensoresPage.css'
import { toast } from 'sonner'

function SensoresDeGalpon({ galpon }: { galpon: Galpon }) {
  const { sensores, cargando, error, crear, alternar, eliminar } = useSensores(
    galpon.id,
  )
  const { tipos } = useCatalogoSensores()
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [form, setForm] = useState<DatosSensor>(FORMULARIO_SENSOR_INICIAL)
  const [dispositivoId, setDispositivoId] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    // Sin la guarda, al saltar de un galpón a otro la respuesta lenta del
    // primero pisaba la lista del segundo: el desplegable ofrecía
    // dispositivos de otro galpón, y el backend los rechaza por la clave
    // compuesta (dispositivo_id, galpon_id).
    let vigente = true
    void listarDispositivos()
      .then((todos) => {
        if (!vigente) return
        setDispositivos(todos.filter((d) => d.galpon.id === galpon.id && d.activo))
      })
      .catch(() => {
        if (!vigente) return
        setDispositivos([])
        toast.error('No se pudieron cargar los dispositivos del galpón.')
      })
    return () => {
      vigente = false
    }
  }, [galpon.id])

  function campo<K extends keyof DatosSensor>(k: K, v: DatosSensor[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setErrorAccion('')
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
      const creado = await crear(payload)
      setOk(`Sensor "${creado.codigo}" creado.`)
      setForm((prev) => ({ ...prev, codigo: '' }))
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo crear el sensor.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleAlternar(s: Sensor) {
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
      {errorAccion && (
        <div className="sn-alert sn-alert--error" role="alert">
          {errorAccion}
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
              {tipos.map((t) => (
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
                        onClick={() => handleAlternar(s)}
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
