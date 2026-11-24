import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useState, type FormEvent } from 'react'
import { getRol } from '@shared/api'
import { permisosOperativosDeGalpon } from '@shared/auth/permisos'
import { IcCheck, IcFan, IcPlus, IcSettings } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { fechaDeHoy } from '@shared/utils/fechas'
import { validarCodigo, validarNombreEntidad, validarTextoSeguro } from '@shared/utils/validacion'
import type { Galpon } from '@features/galpones/api/galpones'
import type { CrearEquipoPayload, Equipo } from '../api/equipos'
import { useEquipos } from '../hooks/useEquipos'
import {
  ESTADOS_EQUIPO,
  FORMULARIO_EQUIPO_INICIAL,
  UMBRAL_MANTENIMIENTO,
  equiposPorMantener,
  etiquetaEstadoEquipo,
  numeroOpcional,
  porcentajeDesgaste,
  requiereMantenimiento,
  type DatosEquipo,
} from '../model/equipo'
import MantenimientosDeEquipo from './MantenimientosDeEquipo'
import '@shared/ui/admin/AdminKit.css'
import './EquiposDeGalpon.css'

// Solo usa id, código y nombre: así lo abren tanto la pantalla de galpones
// (admin) como la pestaña Equipos de la granja del propietario (HU-37).
type GalponDeEquipos = Pick<Galpon, 'id' | 'codigo' | 'nombre'>

function EquiposDeGalpon({ galpon }: { galpon: GalponDeEquipos }) {
  const { equipos, cargando, error, crear, actualizar, eliminar, recargar } = useEquipos(galpon.id)
  // Registrar equipos, cambiar su estado o darlos de baja es operación del
  // galpón: la hace el propietario; el administrador la consulta.
  const permisos = permisosOperativosDeGalpon(getRol())
  const [form, setForm] = useState<DatosEquipo>(FORMULARIO_EQUIPO_INICIAL)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [equipoAbierto, setEquipoAbierto] = useState<Equipo | null>(null)

  function campo<K extends keyof DatosEquipo>(k: K, v: DatosEquipo[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    const errCodigo = validarCodigo(form.codigo, 'El código del equipo', { max: 60 })
    const errNombre = validarNombreEntidad(form.nombre, 'El nombre del equipo', { max: 120 })
    const errTipo = validarTextoSeguro(form.tipo, 'El tipo de equipo', { max: 40 })
    const errModelo = validarTextoSeguro(form.modelo, 'El modelo', { max: 80 })
    const errFab = validarTextoSeguro(form.fabricante, 'El fabricante', { max: 80 })
    const errSerial = validarCodigo(form.serial, 'El número de serie', { requerido: false, max: 80 })
    const vida = numeroOpcional(form.vida_util_horas)
    const costo = numeroOpcional(form.costo_cop)
    const errNum =
      vida !== undefined && (!Number.isInteger(vida) || vida < 1 || vida > 100_000)
        ? 'La vida útil debe ser un entero entre 1 y 100.000 horas.'
        : costo !== undefined && (costo < 0 || costo > 10_000_000_000)
          ? 'El costo debe estar entre $0 y $10.000.000.000.'
          : null
    const problema = errCodigo ?? errNombre ?? errTipo ?? errModelo ?? errFab ?? errSerial ?? errNum
    if (problema) {
      setErrorForm(problema)
      return
    }
    setGuardando(true)
    try {
      const payload: CrearEquipoPayload = {
        galpon_id: galpon.id,
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        tipo: form.tipo.trim() || undefined,
        es_actuador: form.es_actuador,
        modelo: form.modelo.trim() || undefined,
        fabricante: form.fabricante.trim() || undefined,
        serial: form.serial.trim() || undefined,
        fecha_instalacion: form.fecha_instalacion
          ? new Date(form.fecha_instalacion).toISOString()
          : undefined,
        vida_util_horas: vida,
        costo_cop: costo,
      }
      await crear(payload)
      setForm(FORMULARIO_EQUIPO_INICIAL)
      setMostrarForm(false)
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo registrar el equipo.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleEstado(equipo: Equipo, estado: string) {
    setErrorAccion('')
    try {
      await actualizar(equipo.id, { estado_actual: estado })
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo cambiar el estado del equipo.'))
    }
  }

  async function handleEliminar(equipo: Equipo) {
    const confirmar = (await confirmarAccion({
      titulo: '¿Dar de baja este equipo?',
      entidad: equipo.nombre,
      descripcion: 'No se puede dar de baja si tiene mantenimientos o accionamientos registrados.',
      textoConfirmar: 'Dar de baja',
      tono: 'peligro',
    }))
    if (!confirmar) return
    setErrorAccion('')
    try {
      await eliminar(equipo.id)
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo dar de baja el equipo.'))
    }
  }

  if (equipoAbierto) {
    return (
      <MantenimientosDeEquipo
        equipo={equipoAbierto}
        onVolver={() => setEquipoAbierto(null)}
      />
    )
  }

  const operativos = equipos.filter((e) => e.estado_actual === 'operativo').length
  const actuadores = equipos.filter((e) => e.es_actuador).length
  const porMantener = equiposPorMantener(equipos)

  return (
    <div className="eq">
      <ul className="adm-kpis adm-kpis--3" aria-label="Resumen de equipos">
        <li>
          <div className="adm-kpi adm-kpi--primario">
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Total</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcSettings size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{equipos.length.toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">Equipos en el galpón</span>
          </div>
        </li>
        <li>
          <div className="adm-kpi adm-kpi--ok">
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Operativos</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcCheck size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{operativos.toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">En funcionamiento normal</span>
          </div>
        </li>
        <li>
          <div className="adm-kpi adm-kpi--info">
            <span className="adm-kpi-cab">
              <span className="adm-kpi-etiqueta">Con motor o relé</span>
              <span className="adm-kpi-icono" aria-hidden="true"><IcFan size={16} /></span>
            </span>
            <strong className="adm-kpi-valor">{actuadores.toLocaleString('es-CO')}</strong>
            <span className="adm-kpi-nota">Equipos motorizados</span>
          </div>
        </li>
      </ul>

      {/* Equipos es inventario, no control: sin esta nota se confunde con los
          relés K1-K4, que viven en Sensores y se accionan desde Monitoreo. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <p className="eq-nota" style={{ flex: '1 1 280px', margin: 0 }}>
          Inventario de las máquinas del galpón para llevar mantenimientos, desgaste y costos.
          Los relés K1-K4 se controlan desde Monitoreo → Actuadores.
        </p>
        {permisos.configurar && (
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={() => { setMostrarForm((v) => !v); setErrorForm('') }}
          >
            <IcPlus size={15} aria-hidden="true" />
            {mostrarForm ? 'Ocultar formulario' : 'Registrar equipo'}
          </button>
        )}
      </div>

      {porMantener.length > 0 && (
        <div className="eq-alert eq-alert--aviso" role="status">
          <strong>
            {porMantener.length === 1
              ? '1 equipo necesita mantenimiento.'
              : `${porMantener.length} equipos necesitan mantenimiento.`}
          </strong>{' '}
          {porMantener.map((e) => e.nombre).join(', ')}{' '}
          {porMantener.length === 1 ? 'llegó' : 'llegaron'} al {UMBRAL_MANTENIMIENTO} % de su vida útil.
          {permisos.configurar && ' Abre «Mantenimientos» para programarlo.'}
        </div>
      )}

      {error && (
        <div className="adm-alerta" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void recargar()}>Reintentar</button>
        </div>
      )}
      {errorAccion && (
        <div className="eq-alert eq-alert--error" role="alert">{errorAccion}</div>
      )}

      {permisos.configurar && mostrarForm && (
      <form className="eq-card eq-form" onSubmit={handleCrear}>
        <h2 className="eq-form-titulo">Registrar equipo</h2>
        <div className="eq-grid">
          <label className="eq-campo">
            <span>Galpón</span>
            <input value={`${galpon.codigo} · ${galpon.nombre}`} disabled />
          </label>
          <label className="eq-campo">
            <span>Código único</span>
            <input
              value={form.codigo}
              onChange={(e) => campo('codigo', e.target.value)}
              placeholder="COM-G1-01"
              maxLength={60}
              required
            />
          </label>
          <label className="eq-campo">
            <span>Nombre</span>
            <input
              value={form.nombre}
              onChange={(e) => campo('nombre', e.target.value)}
              placeholder="Comedero lineal"
              maxLength={120}
              required
            />
          </label>
          <label className="eq-campo">
            <span>Tipo <em>(opcional)</em></span>
            <input
              value={form.tipo}
              onChange={(e) => campo('tipo', e.target.value)}
              placeholder="Alimentación"
              maxLength={40}
            />
          </label>
          <label className="eq-campo">
            <span>Modelo <em>(opcional)</em></span>
            <input value={form.modelo} onChange={(e) => campo('modelo', e.target.value)} maxLength={80} />
          </label>
          <label className="eq-campo">
            <span>Fabricante <em>(opcional)</em></span>
            <input
              value={form.fabricante}
              onChange={(e) => campo('fabricante', e.target.value)}
              maxLength={80}
            />
          </label>
          <label className="eq-campo">
            <span>Serial <em>(opcional)</em></span>
            <input value={form.serial} onChange={(e) => campo('serial', e.target.value)} maxLength={80} />
          </label>
          <label className="eq-campo">
            <span>Instalación <em>(opcional)</em></span>
            <input
              type="date"
              max={fechaDeHoy()}
              value={form.fecha_instalacion}
              onChange={(e) => campo('fecha_instalacion', e.target.value)}
            />
          </label>
          <label className="eq-campo">
            <span>Vida útil (horas) <em>(opcional)</em></span>
            <input
              type="number"
              min={1}
              max={100000}
              step={1}
              inputMode="numeric"
              value={form.vida_util_horas}
              onChange={(e) => campo('vida_util_horas', e.target.value)}
            />
          </label>
          <label className="eq-campo">
            <span>Costo COP <em>(opcional)</em></span>
            <input
              type="number"
              min={0}
              max={10000000000}
              step={1}
              inputMode="numeric"
              value={form.costo_cop}
              onChange={(e) => campo('costo_cop', e.target.value)}
            />
          </label>
          <label className="eq-campo eq-campo--check">
            <input
              type="checkbox"
              checked={form.es_actuador}
              onChange={(e) => campo('es_actuador', e.target.checked)}
            />
            <span>Lo mueve un motor o un relé <em>(solo informativo: no se controla desde aquí)</em></span>
          </label>
        </div>

        {errorForm && <p className="eq-alert eq-alert--error" role="alert">{errorForm}</p>}

        <div className="eq-form-acciones">
          <button type="submit" className="eq-btn eq-btn--primary" disabled={guardando}>
            {guardando ? 'Registrando…' : '+ Registrar equipo'}
          </button>
        </div>
      </form>
      )}

      <div className="eq-card">
        {cargando ? (
          <p className="eq-empty">Cargando equipos…</p>
        ) : equipos.length === 0 ? (
          <div className="eq-vacio">
            <p className="eq-vacio-titulo">Este galpón no tiene equipos.</p>
            {permisos.configurar && (
              <p className="eq-vacio-sub">Registra el primero con el formulario de arriba.</p>
            )}
          </div>
        ) : (
          <div className="eq-tabla-scroll">
            <table className="eq-tabla">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Desgaste</th>
                  <th>Estado</th>
                  <th aria-label="Acciones"></th>
                </tr>
              </thead>
              <tbody>
                {equipos.map((equipo) => {
                  const desgaste = porcentajeDesgaste(
                    equipo.horas_operacion,
                    equipo.vida_util_horas,
                  )
                  return (
                    <tr
                      key={equipo.id}
                      className={equipo.estado_actual === 'operativo' ? '' : 'is-inactive'}
                    >
                      <td><code>{equipo.codigo}</code></td>
                      <td>
                        {equipo.nombre}
                        {equipo.es_actuador && <span className="eq-tag">motor o relé</span>}
                      </td>
                      <td>{equipo.tipo ?? '—'}</td>
                      <td>
                        {desgaste === null ? (
                          <span className="eq-sin-dato" title="Sin vida útil declarada">—</span>
                        ) : (
                          <span className={desgaste >= 90 ? 'eq-desgaste-alto' : ''}>
                            {desgaste}%
                            {requiereMantenimiento(desgaste) && equipo.estado_actual === 'operativo' && (
                              <span className="eq-tag eq-tag--aviso">mantenimiento</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        {permisos.configurar ? (
                          <select
                            className="eq-estado-select"
                            value={equipo.estado_actual}
                            onChange={(e) => void handleEstado(equipo, e.target.value)}
                          >
                            {ESTADOS_EQUIPO.map((estado) => (
                              <option key={estado} value={estado}>{etiquetaEstadoEquipo(estado)}</option>
                            ))}
                          </select>
                        ) : (
                          etiquetaEstadoEquipo(equipo.estado_actual)
                        )}
                      </td>
                      <td className="eq-acciones">
                        <button
                          type="button"
                          className="eq-btn eq-btn--sm"
                          onClick={() => setEquipoAbierto(equipo)}
                        >
                          Mantenimientos
                        </button>
                        {permisos.configurar && (
                          <button
                            type="button"
                            className="eq-btn eq-btn--sm eq-btn--danger"
                            onClick={() => void handleEliminar(equipo)}
                          >
                            Dar de baja
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default EquiposDeGalpon
