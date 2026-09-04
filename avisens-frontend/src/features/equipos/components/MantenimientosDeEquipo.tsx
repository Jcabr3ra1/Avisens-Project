import { useState, type FormEvent } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type { Equipo } from '../api/equipos'
import type { Mantenimiento } from '../api/mantenimientos'
import { useMantenimientos } from '../hooks/useMantenimientos'
import {
  FORMULARIO_MANTENIMIENTO_INICIAL,
  TIPOS_MANTENIMIENTO,
  type DatosMantenimiento,
} from '../model/mantenimiento'
import { numeroOpcional } from '../model/equipo'
import RepuestosDeMantenimiento from './RepuestosDeMantenimiento'

function fecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

function MantenimientosDeEquipo({
  equipo,
  onVolver,
}: {
  equipo: Equipo
  onVolver: () => void
}) {
  const { mantenimientos, cargando, error, crear, marcarCompletado, eliminar } =
    useMantenimientos(equipo.id)
  const [form, setForm] = useState<DatosMantenimiento>(FORMULARIO_MANTENIMIENTO_INICIAL)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [abierto, setAbierto] = useState<number | null>(null)

  function campo<K extends keyof DatosMantenimiento>(k: K, v: DatosMantenimiento[K]) {
    setForm((prev) => ({ ...prev, [k]: v }))
  }

  async function handleCrear(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')
    setGuardando(true)
    try {
      await crear({
        equipo_id: equipo.id,
        fecha_programada: new Date(form.fecha_programada).toISOString(),
        tipo: form.tipo.trim() || undefined,
        tecnico_responsable: form.tecnico_responsable.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
        costo_cop: numeroOpcional(form.costo_cop),
      })
      setForm(FORMULARIO_MANTENIMIENTO_INICIAL)
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo programar el mantenimiento.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleCompletar(mantenimiento: Mantenimiento) {
    setErrorAccion('')
    try {
      await marcarCompletado(mantenimiento.id)
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo completar el mantenimiento.'))
    }
  }

  async function handleEliminar(mantenimiento: Mantenimiento) {
    const confirmar = window.confirm(
      '¿Eliminar este mantenimiento? Esta acción no se deshace.',
    )
    if (!confirmar) return
    setErrorAccion('')
    try {
      await eliminar(mantenimiento.id)
    } catch (err) {
      setErrorAccion(mensajeDeError(err, 'No se pudo eliminar el mantenimiento.'))
    }
  }

  return (
    <div className="eq">
      <button type="button" className="eq-volver" onClick={onVolver}>
        ← Equipos del galpón
      </button>

      <div className="eq-cabecera-equipo">
        <strong>{equipo.nombre}</strong>
        <span><code>{equipo.codigo}</code> · {equipo.estado_actual}</span>
      </div>

      {error && <div className="eq-alert eq-alert--error" role="alert">{error}</div>}
      {errorAccion && (
        <div className="eq-alert eq-alert--error" role="alert">{errorAccion}</div>
      )}

      <form className="eq-card eq-form" onSubmit={handleCrear}>
        <h2 className="eq-form-titulo">Programar mantenimiento</h2>
        <div className="eq-grid">
          <label className="eq-campo">
            <span>tipo</span>
            <select value={form.tipo} onChange={(e) => campo('tipo', e.target.value)}>
              {TIPOS_MANTENIMIENTO.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>
          <label className="eq-campo">
            <span>fecha programada</span>
            <input
              type="date"
              value={form.fecha_programada}
              onChange={(e) => campo('fecha_programada', e.target.value)}
              required
            />
          </label>
          <label className="eq-campo">
            <span>técnico <em>(opcional)</em></span>
            <input
              value={form.tecnico_responsable}
              onChange={(e) => campo('tecnico_responsable', e.target.value)}
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
          <label className="eq-campo eq-campo--ancho">
            <span>descripción <em>(opcional)</em></span>
            <input
              value={form.descripcion}
              onChange={(e) => campo('descripcion', e.target.value)}
              placeholder="Cambio de rodamientos"
            />
          </label>
        </div>

        {errorForm && <p className="eq-alert eq-alert--error" role="alert">{errorForm}</p>}

        <div className="eq-form-acciones">
          <button type="submit" className="eq-btn eq-btn--primary" disabled={guardando}>
            {guardando ? 'Programando…' : '+ Programar'}
          </button>
        </div>
      </form>

      <div className="eq-card">
        {cargando ? (
          <p className="eq-empty">Cargando mantenimientos…</p>
        ) : mantenimientos.length === 0 ? (
          <div className="eq-vacio">
            <p className="eq-vacio-titulo">Este equipo no tiene mantenimientos.</p>
            <p className="eq-vacio-sub">Programa el primero con el formulario de arriba.</p>
          </div>
        ) : (
          <ul className="eq-mant-lista">
            {mantenimientos.map((mantenimiento) => (
              <li key={mantenimiento.id} className="eq-mant">
                <div className="eq-mant-fila">
                  <span className={`eq-badge eq-badge--${mantenimiento.estado}`}>
                    {mantenimiento.estado}
                  </span>
                  <span className="eq-mant-tipo">{mantenimiento.tipo ?? 'sin tipo'}</span>
                  <span className="eq-mant-fecha">
                    {fecha(mantenimiento.fecha_programada)}
                  </span>
                  <span className="eq-mant-desc">{mantenimiento.descripcion ?? '—'}</span>
                  <span className="eq-mant-acciones">
                    <button
                      type="button"
                      className="eq-btn eq-btn--sm"
                      onClick={() =>
                        setAbierto(abierto === mantenimiento.id ? null : mantenimiento.id)
                      }
                    >
                      Repuestos
                    </button>
                    {mantenimiento.estado !== 'completado' && (
                      <button
                        type="button"
                        className="eq-btn eq-btn--sm"
                        onClick={() => void handleCompletar(mantenimiento)}
                      >
                        Completar
                      </button>
                    )}
                    <button
                      type="button"
                      className="eq-btn eq-btn--sm eq-btn--danger"
                      onClick={() => void handleEliminar(mantenimiento)}
                    >
                      Eliminar
                    </button>
                  </span>
                </div>

                {abierto === mantenimiento.id && (
                  <RepuestosDeMantenimiento mantenimientoId={mantenimiento.id} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default MantenimientosDeEquipo
