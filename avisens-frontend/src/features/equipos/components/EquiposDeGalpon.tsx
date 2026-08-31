import { useState, type FormEvent } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type { Galpon } from '@features/galpones/api/galpones'
import type { CrearEquipoPayload, Equipo } from '../api/equipos'
import { useEquipos } from '../hooks/useEquipos'
import {
  ESTADOS_EQUIPO,
  FORMULARIO_EQUIPO_INICIAL,
  numeroOpcional,
  porcentajeDesgaste,
  type DatosEquipo,
} from '../model/equipo'
import MantenimientosDeEquipo from './MantenimientosDeEquipo'
import './EquiposDeGalpon.css'

function EquiposDeGalpon({ galpon }: { galpon: Galpon }) {
  const { equipos, cargando, error, crear, actualizar, eliminar } = useEquipos(galpon.id)
  const [form, setForm] = useState<DatosEquipo>(FORMULARIO_EQUIPO_INICIAL)
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
        vida_util_horas: numeroOpcional(form.vida_util_horas),
        costo_cop: numeroOpcional(form.costo_cop),
      }
      await crear(payload)
      setForm(FORMULARIO_EQUIPO_INICIAL)
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
    const confirmar = window.confirm(
      `¿Dar de baja el equipo "${equipo.nombre}"?\n` +
        'Falla si tiene mantenimientos o accionamientos registrados.',
    )
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

  return (
    <div className="eq">
      <div className="eq-resumen">
        <div className="eq-stat">
          <span className="eq-stat-valor">{equipos.length}</span>
          <span className="eq-stat-label">Total</span>
        </div>
        <div className="eq-stat eq-stat--activo">
          <span className="eq-stat-valor">{operativos}</span>
          <span className="eq-stat-label">Operativos</span>
        </div>
        <div className="eq-stat">
          <span className="eq-stat-valor">{actuadores}</span>
          <span className="eq-stat-label">Actuadores</span>
        </div>
      </div>

      {error && <div className="eq-alert eq-alert--error" role="alert">{error}</div>}
      {errorAccion && (
        <div className="eq-alert eq-alert--error" role="alert">{errorAccion}</div>
      )}

      <form className="eq-card eq-form" onSubmit={handleCrear}>
        <h2 className="eq-form-titulo">Registrar equipo</h2>
        <div className="eq-grid">
          <label className="eq-campo">
            <span>galpón</span>
            <input value={`${galpon.codigo} · ${galpon.nombre}`} disabled />
          </label>
          <label className="eq-campo">
            <span>código único</span>
            <input
              value={form.codigo}
              onChange={(e) => campo('codigo', e.target.value)}
              placeholder="VENT-G1-01"
              required
            />
          </label>
          <label className="eq-campo">
            <span>nombre</span>
            <input
              value={form.nombre}
              onChange={(e) => campo('nombre', e.target.value)}
              placeholder="Ventilador extractor"
              required
            />
          </label>
          <label className="eq-campo">
            <span>tipo <em>(opcional)</em></span>
            <input
              value={form.tipo}
              onChange={(e) => campo('tipo', e.target.value)}
              placeholder="ventilacion"
            />
          </label>
          <label className="eq-campo">
            <span>modelo <em>(opcional)</em></span>
            <input value={form.modelo} onChange={(e) => campo('modelo', e.target.value)} />
          </label>
          <label className="eq-campo">
            <span>fabricante <em>(opcional)</em></span>
            <input
              value={form.fabricante}
              onChange={(e) => campo('fabricante', e.target.value)}
            />
          </label>
          <label className="eq-campo">
            <span>serial <em>(opcional)</em></span>
            <input value={form.serial} onChange={(e) => campo('serial', e.target.value)} />
          </label>
          <label className="eq-campo">
            <span>instalación <em>(opcional)</em></span>
            <input
              type="date"
              value={form.fecha_instalacion}
              onChange={(e) => campo('fecha_instalacion', e.target.value)}
            />
          </label>
          <label className="eq-campo">
            <span>vida útil (horas) <em>(opcional)</em></span>
            <input
              type="number"
              min={0}
              value={form.vida_util_horas}
              onChange={(e) => campo('vida_util_horas', e.target.value)}
            />
          </label>
          <label className="eq-campo">
            <span>costo COP <em>(opcional)</em></span>
            <input
              type="number"
              min={0}
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
            <span>Es actuador (el sistema puede accionarlo)</span>
          </label>
        </div>

        {errorForm && <p className="eq-alert eq-alert--error" role="alert">{errorForm}</p>}

        <div className="eq-form-acciones">
          <button type="submit" className="eq-btn eq-btn--primary" disabled={guardando}>
            {guardando ? 'Registrando…' : '+ Registrar equipo'}
          </button>
        </div>
      </form>

      <div className="eq-card">
        {cargando ? (
          <p className="eq-empty">Cargando equipos…</p>
        ) : equipos.length === 0 ? (
          <div className="eq-vacio">
            <p className="eq-vacio-titulo">Este galpón no tiene equipos.</p>
            <p className="eq-vacio-sub">Registra el primero con el formulario de arriba.</p>
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
                        {equipo.es_actuador && <span className="eq-tag">actuador</span>}
                      </td>
                      <td>{equipo.tipo ?? '—'}</td>
                      <td>
                        {desgaste === null ? (
                          <span className="eq-sin-dato" title="Sin vida útil declarada">—</span>
                        ) : (
                          <span className={desgaste >= 90 ? 'eq-desgaste-alto' : ''}>
                            {desgaste}%
                          </span>
                        )}
                      </td>
                      <td>
                        <select
                          className="eq-estado-select"
                          value={equipo.estado_actual}
                          onChange={(e) => void handleEstado(equipo, e.target.value)}
                        >
                          {ESTADOS_EQUIPO.map((estado) => (
                            <option key={estado} value={estado}>{estado}</option>
                          ))}
                        </select>
                      </td>
                      <td className="eq-acciones">
                        <button
                          type="button"
                          className="eq-btn eq-btn--sm"
                          onClick={() => setEquipoAbierto(equipo)}
                        >
                          Mantenimientos
                        </button>
                        <button
                          type="button"
                          className="eq-btn eq-btn--sm eq-btn--danger"
                          onClick={() => void handleEliminar(equipo)}
                        >
                          Dar de baja
                        </button>
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
