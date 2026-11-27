import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useEffect, useState, type FormEvent } from 'react'
import { type CrearSensorPayload, type Sensor } from '@features/sensores/api/sensores'
import {
  listarDispositivos,
  type Dispositivo,
} from '@features/dispositivos/api/dispositivos'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { IcAlert, IcCheck, IcPlus, IcThermo } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { validarCodigo, validarTextoSeguro } from '@shared/utils/validacion'
import type { Galpon } from '@features/galpones/api/galpones'
import { useCatalogoSensores } from '../hooks/useCatalogoSensores'
import { useSensores } from '../hooks/useSensores'
import FormularioSensor from './FormularioSensor'
import FichaActuador from './FichaActuador'
import { esSensorRele } from '../model/reles'
import {
  FORMULARIO_SENSOR_INICIAL,
  type DatosSensor,
} from '../model/sensor'
import { MedicionesVivas } from './MedicionesVivas'
import '@shared/ui/admin/AdminKit.css'
import '../SensoresPage.css'
import { toast } from 'sonner'

function SensoresDeGalpon({ galpon }: { galpon: Galpon }) {
  const { sensores, cargando, error, crear, actualizar, alternar, eliminar, recargar } = useSensores(
    galpon.id,
  )
  const { tipos } = useCatalogoSensores()
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([])
  const [form, setForm] = useState<DatosSensor>(FORMULARIO_SENSOR_INICIAL)
  const [editando, setEditando] = useState<Sensor | null>(null)
  // El administrador AVISENS es el único que administra sensores.
  const puedeGestionar = getRol() === ROL_ADMIN
  const conAcciones = puedeGestionar
  const [dispositivoId, setDispositivoId] = useState('')
  const [mostrarForm, setMostrarForm] = useState(false)
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
    const errCodigo = validarCodigo(form.codigo, 'El código del sensor', { max: 60 })
    const errTipo = validarTextoSeguro(form.tipo, 'El tipo de sensor', { requerido: true, max: 40 })
    const errUnidad = validarTextoSeguro(form.unidad_medida, 'La unidad de medida', { requerido: true, max: 20 })
    const errModelo = validarTextoSeguro(form.modelo, 'El modelo', { max: 80 })
    const errFab = validarTextoSeguro(form.fabricante, 'El fabricante', { max: 80 })
    const problema = errCodigo ?? errTipo ?? errUnidad ?? errModelo ?? errFab
    if (problema) {
      setErrorForm(problema)
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
    await confirmarAccion({
      titulo: '¿Eliminar este sensor?',
      entidad: s.codigo,
      descripcion: 'Dejará de aparecer en AVISENS. Si tiene lecturas o alertas, su historial se conserva para los reportes.',
      textoConfirmar: 'Eliminar sensor',
      textoProcesando: 'Eliminando…',
      onConfirmar: async () => {
        setErrorAccion('')
        await eliminar(s.id)
      },
    })
  }

  const activos = sensores.filter((s) => s.estado === 'activo').length

  return (
    <div className="sensores">
      <ul className="adm-kpis adm-kpis--3" aria-label="Resumen de sensores del galpón">
        <li>
          <div className="adm-kpi adm-kpi--primario">
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Total</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcThermo size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{sensores.length.toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">Sensores en el galpón</span>
          </div>
        </li>
        <li>
          <div className="adm-kpi adm-kpi--ok">
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Activos</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcCheck size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{activos.toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">Habilitados para lectura</span>
          </div>
        </li>
        <li>
          <div className={`adm-kpi adm-kpi--${sensores.length - activos > 0 ? 'alerta' : 'ok'}`}>
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Inactivos</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcAlert size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{(sensores.length - activos).toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">{sensores.length - activos > 0 ? 'Fuera de monitoreo' : 'Todos activos'}</span>
          </div>
        </li>
      </ul>

      {puedeGestionar && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={() => { setMostrarForm((v) => !v); setErrorForm('') }}
          >
            <IcPlus size={15} aria-hidden="true" />
            {mostrarForm ? 'Ocultar formulario' : 'Registrar sensor'}
          </button>
        </div>
      )}

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}
      {errorAccion && (
        <div className="sn-alert sn-alert--error" role="alert">
          {errorAccion}
        </div>
      )}

      {puedeGestionar && mostrarForm && (
      <form className="sn-card sn-form" onSubmit={handleCrear}>
        <h2 className="sn-form-titulo">Registrar sensor</h2>
        <div className="sn-grid">
          <label className="sn-campo">
            <span>Galpón</span>
            <input value={`${galpon.codigo} · ${galpon.nombre}`} disabled />
          </label>
          <label className="sn-campo">
            <span>Dispositivo</span>
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
            <span>Código único</span>
            <input
              value={form.codigo}
              onChange={(e) => campo('codigo', e.target.value)}
              placeholder="TEMP-G1-01"
              maxLength={60}
              required
            />
          </label>
          <label className="sn-campo">
            <span>Tipo</span>
            <input
              list="tipos-sensor-galpon"
              value={form.tipo}
              onChange={(e) => campo('tipo', e.target.value)}
              maxLength={40}
              required
            />
            <datalist id="tipos-sensor-galpon">
              {tipos.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="sn-campo">
            <span>Unidad</span>
            <input
              value={form.unidad_medida}
              onChange={(e) => campo('unidad_medida', e.target.value)}
              placeholder="°C"
              maxLength={20}
              required
            />
          </label>
          <label className="sn-campo">
            <span>
              Modelo <em>(opcional)</em>
            </span>
            <input
              value={form.modelo}
              onChange={(e) => campo('modelo', e.target.value)}
              placeholder="DHT22"
              maxLength={80}
            />
          </label>
          <label className="sn-campo">
            <span>
              Fabricante <em>(opcional)</em>
            </span>
            <input
              value={form.fabricante}
              onChange={(e) => campo('fabricante', e.target.value)}
              placeholder="Aosong"
              maxLength={80}
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
      )}

      <div className="sn-card">
        {cargando ? (
          <p className="sn-empty">Cargando sensores…</p>
        ) : sensores.length === 0 ? (
          <div className="sn-vacio">
            <p className="sn-vacio-titulo">
              Este galpón no tiene sensores registrados.
            </p>
            {puedeGestionar && (
              <p className="sn-vacio-sub">
                Crea el primero con el formulario de arriba.
              </p>
            )}
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
                  {conAcciones && <th aria-label="Acciones"></th>}
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
                    {conAcciones && (
                    <td className="sn-acciones">
                      {puedeGestionar && (
                        <button
                          className="sn-btn sn-btn--sm"
                          onClick={() => setEditando(s)}
                        >
                          Editar
                        </button>
                      )}
                      {puedeGestionar && (
                        <button
                          className="sn-btn sn-btn--sm"
                          onClick={() => handleAlternar(s)}
                        >
                          {s.estado === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                      )}
                      {puedeGestionar && (
                        <button
                          className="sn-btn sn-btn--sm sn-btn--danger"
                          onClick={() => handleEliminar(s)}
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

      <MedicionesVivas sensores={sensores} />

      {/* Un relé se edita en su ficha: protege ESP32, canal y código, que
          deciden a dónde llegan sus órdenes. */}
      {editando && esSensorRele(editando) && (
        <FichaActuador
          sensorId={editando.id}
          puedeEditar={puedeGestionar}
          onCerrar={() => setEditando(null)}
          onGuardado={() => { void recargar() }}
        />
      )}
      {editando && !esSensorRele(editando) && (
        <FormularioSensor
          sensor={editando}
          onGuardar={actualizar}
          onCerrar={() => setEditando(null)}
        />
      )}
    </div>
  )
}

export default SensoresDeGalpon
