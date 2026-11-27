import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useState, type FormEvent } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { type CrearSensorPayload, type Sensor } from '@features/sensores/api/sensores'
import CabeceraAdmin from '@shared/ui/admin/CabeceraAdmin'
import { IcAlert, IcCheck, IcPlus, IcThermo } from '@shared/ui/icons/icons'
import { useRefetchOnFocus } from '@shared/hooks/useRefetchOnFocus'
import { mensajeDeError } from '@shared/utils/errores'
import { validarCodigo, validarTextoSeguro } from '@shared/utils/validacion'
import { useCatalogoSensores } from './hooks/useCatalogoSensores'
import { useOpcionesSensor } from './hooks/useOpcionesSensor'
import { useSensores } from './hooks/useSensores'
import { MedicionesVivas } from './components/MedicionesVivas'
import '@shared/ui/admin/AdminKit.css'
import './SensoresPage.css'

// Vista transversal de sensores: el inventario completo, sin bajar galpón por
// galpón. Los sensores de UN galpón se ven desde su propia pantalla hija.

// Sin galpón ni dispositivo elegidos: 0 no es un id válido, así que el
// formulario no puede enviarse hasta que el usuario escoja ambos.
const FORM_INICIAL: CrearSensorPayload = {
  galpon_id: 0,
  dispositivo_id: 0,
  codigo: '',
  tipo: 'temperatura',
  unidad_medida: '°C',
  modelo: '',
  fabricante: '',
}

function SensoresPage() {
  const { sensores, cargando, error, crear, alternar, eliminar, recargar } =
    useSensores()
  useRefetchOnFocus(recargar)
  const { tipos } = useCatalogoSensores()
  const [form, setForm] = useState<CrearSensorPayload>(FORM_INICIAL)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [errorForm, setErrorForm] = useState('')
  const [ok, setOk] = useState('')

  const rol = getRol()
  const puedeGestionar = rol === ROL_ADMIN
  const { galpones, dispositivosDelGalpon, cargando: cargandoOpciones } =
    useOpcionesSensor(form.galpon_id)

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
    const errCodigo = validarCodigo(form.codigo, 'El código del sensor', { requerido: false, max: 60 })
    const errUnidad = validarTextoSeguro(form.unidad_medida, 'La unidad de medida', { max: 20 })
    const errModelo = validarTextoSeguro(form.modelo ?? '', 'El modelo', { max: 80 })
    const errFab = validarTextoSeguro(form.fabricante ?? '', 'El fabricante', { max: 80 })
    const problema = errCodigo ?? errUnidad ?? errModelo ?? errFab
    if (problema) {
      setErrorForm(problema)
      return
    }
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
    <div className="page-container adm-page sensores">
      <CabeceraAdmin
        eyebrow="Monitoreo IoT"
        titulo="Sensores"
        subtitulo="Inventario de sensores instalados en los galpones a tu alcance."
        acciones={puedeGestionar ? (
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={() => { setMostrarForm((v) => !v); setErrorForm('') }}
          >
            <IcPlus size={15} aria-hidden="true" />
            {mostrarForm ? 'Ocultar formulario' : 'Registrar sensor'}
          </button>
        ) : undefined}
      />

      {/* ── Resumen ─────────────────────────────────────────────────────── */}
      <ul className="adm-kpis adm-kpis--3" aria-label="Resumen de sensores">
        <li>
          <div className="adm-kpi adm-kpi--primario">
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Total</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcThermo size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{sensores.length.toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">Sensores registrados</span>
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

      {/* ── Alta de sensor ──────────────────────────────────────────────── */}
      {puedeGestionar && mostrarForm && <form className="sn-card sn-form" onSubmit={handleCrear}>
        <h2 className="sn-form-titulo">Registrar sensor</h2>
        <div className="sn-grid">
          <label className="sn-campo">
            <span>Galpón</span>
            <select
              value={form.galpon_id || ''}
              onChange={(e) => {
                campo('galpon_id', Number(e.target.value))
                // El dispositivo elegido pertenecía al galpón anterior.
                campo('dispositivo_id', 0)
              }}
              disabled={cargandoOpciones}
              required
            >
              <option value="" disabled>
                {cargandoOpciones ? 'Cargando…' : 'Elige un galpón'}
              </option>
              {galpones.map((galpon) => (
                <option key={galpon.id} value={galpon.id}>
                  {galpon.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="sn-campo">
            <span>Dispositivo</span>
            <select
              value={form.dispositivo_id || ''}
              onChange={(e) => campo('dispositivo_id', Number(e.target.value))}
              disabled={!form.galpon_id || dispositivosDelGalpon.length === 0}
              required
            >
              <option value="" disabled>
                {!form.galpon_id
                  ? 'Elige primero el galpón'
                  : dispositivosDelGalpon.length === 0
                    ? 'Este galpón no tiene dispositivos'
                    : 'Elige un dispositivo'}
              </option>
              {dispositivosDelGalpon.map((dispositivo) => (
                <option key={dispositivo.id} value={dispositivo.id}>
                  {dispositivo.nombre}
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
              list="tipos-sensor"
              value={form.tipo}
              onChange={(e) => campo('tipo', e.target.value)}
              required
            />
            <datalist id="tipos-sensor">
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
      </form>}

      {/* ── Listado ─────────────────────────────────────────────────────── */}
      <div className="sn-card">
        {cargando ? (
          <p className="sn-empty">Cargando sensores…</p>
        ) : sensores.length === 0 ? (
          <div className="sn-vacio">
            <p className="sn-vacio-titulo">No hay sensores registrados.</p>
            {puedeGestionar && <p className="sn-vacio-sub">Crea el primero con el formulario de arriba.</p>}
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
                  {puedeGestionar && <th aria-label="Acciones"></th>}
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
                    {puedeGestionar && <td className="sn-acciones">
                      <button className="sn-btn sn-btn--sm" onClick={() => handleToggle(s)}>
                        {s.estado === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="sn-btn sn-btn--sm sn-btn--danger"
                        onClick={() => handleEliminar(s)}
                      >
                        Eliminar
                      </button>
                    </td>}
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
