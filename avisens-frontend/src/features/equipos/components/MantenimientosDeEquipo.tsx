import { confirmarAccion } from '@shared/ui/ConfirmarAccion/gestorConfirmacion'
import { useState, type FormEvent } from 'react'
import { getRol } from '@shared/api'
import { permisosOperativosDeGalpon } from '@shared/auth/permisos'
import { IcPlus } from '@shared/ui/icons/icons'
import { mensajeDeError } from '@shared/utils/errores'
import { formatearFechaCalendario } from '@shared/utils/fechas'
import { validarTextoSeguro } from '@shared/utils/validacion'
import type { Equipo } from '../api/equipos'
import type { Mantenimiento } from '../api/mantenimientos'
import { useMantenimientos } from '../hooks/useMantenimientos'
import {
  FORMULARIO_MANTENIMIENTO_INICIAL,
  TIPOS_MANTENIMIENTO,
  type DatosMantenimiento,
} from '../model/mantenimiento'
import { etiquetaEstadoEquipo, numeroOpcional } from '../model/equipo'
import RepuestosDeMantenimiento from './RepuestosDeMantenimiento'

function MantenimientosDeEquipo({
  equipo,
  onVolver,
}: {
  equipo: Equipo
  onVolver: () => void
}) {
  const { mantenimientos, cargando, error, crear, marcarCompletado, eliminar, recargar } =
    useMantenimientos(equipo.id)
  const permisos = permisosOperativosDeGalpon(getRol())
  const [form, setForm] = useState<DatosMantenimiento>(FORMULARIO_MANTENIMIENTO_INICIAL)
  const [mostrarForm, setMostrarForm] = useState(false)
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
    const errTec = validarTextoSeguro(form.tecnico_responsable, 'El técnico responsable', {
      max: 120,
      exigirLetras: true,
    })
    const errDesc = validarTextoSeguro(form.descripcion, 'La descripción', {
      max: 500,
      multilinea: true,
    })
    const costo = numeroOpcional(form.costo_cop)
    const errCosto =
      costo !== undefined && (costo < 0 || costo > 10_000_000_000)
        ? 'El costo debe estar entre $0 y $10.000.000.000.'
        : null
    const problema = errTec ?? errDesc ?? errCosto
    if (problema) {
      setErrorForm(problema)
      return
    }
    setGuardando(true)
    try {
      await crear({
        equipo_id: equipo.id,
        fecha_programada: new Date(form.fecha_programada).toISOString(),
        tipo: form.tipo.trim() || undefined,
        tecnico_responsable: form.tecnico_responsable.trim() || undefined,
        descripcion: form.descripcion.trim() || undefined,
        costo_cop: costo,
      })
      setForm(FORMULARIO_MANTENIMIENTO_INICIAL)
      setMostrarForm(false)
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
    const confirmar = (await confirmarAccion({
      titulo: '¿Eliminar este mantenimiento?',
      descripcion: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar mantenimiento',
      tono: 'peligro',
    }))
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

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
        <div className="eq-cabecera-equipo">
          <strong>{equipo.nombre}</strong>
          <span><code>{equipo.codigo}</code> · {etiquetaEstadoEquipo(equipo.estado_actual)}</span>
        </div>
        {permisos.configurar && (
          <button
            type="button"
            className="adm-btn adm-btn--primario"
            onClick={() => { setMostrarForm((v) => !v); setErrorForm('') }}
          >
            <IcPlus size={15} aria-hidden="true" />
            {mostrarForm ? 'Ocultar formulario' : 'Programar mantenimiento'}
          </button>
        )}
      </div>

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
        <h2 className="eq-form-titulo">Programar mantenimiento</h2>
        <div className="eq-grid">
          <label className="eq-campo">
            <span>Tipo</span>
            <select value={form.tipo} onChange={(e) => campo('tipo', e.target.value)}>
              {TIPOS_MANTENIMIENTO.map((tipo) => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>
          <label className="eq-campo">
            <span>Fecha programada</span>
            <input
              type="date"
              value={form.fecha_programada}
              onChange={(e) => campo('fecha_programada', e.target.value)}
              required
            />
          </label>
          <label className="eq-campo">
            <span>Técnico <em>(opcional)</em></span>
            <input
              value={form.tecnico_responsable}
              onChange={(e) => campo('tecnico_responsable', e.target.value)}
              maxLength={120}
            />
          </label>
          <label className="eq-campo">
            <span>Costo COP <em>(opcional)</em></span>
            <input
              type="number"
              min={0}
              max={10000000000}
              value={form.costo_cop}
              onChange={(e) => campo('costo_cop', e.target.value)}
            />
          </label>
          <label className="eq-campo eq-campo--ancho">
            <span>Descripción <em>(opcional)</em></span>
            <input
              value={form.descripcion}
              onChange={(e) => campo('descripcion', e.target.value)}
              placeholder="Cambio de rodamientos"
              maxLength={500}
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
      )}

      <div className="eq-card">
        {cargando ? (
          <p className="eq-empty">Cargando mantenimientos…</p>
        ) : mantenimientos.length === 0 ? (
          <div className="eq-vacio">
            <p className="eq-vacio-titulo">Este equipo no tiene mantenimientos.</p>
            {permisos.configurar && (
              <p className="eq-vacio-sub">Programa el primero con el formulario de arriba.</p>
            )}
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
                    {/* Columna DATE: llega como medianoche UTC y, convertida a la
                        hora de Colombia, se mostraba un día antes. */}
                    {formatearFechaCalendario(mantenimiento.fecha_programada)}
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
                    {permisos.configurar && mantenimiento.estado !== 'completado' && (
                      <button
                        type="button"
                        className="eq-btn eq-btn--sm"
                        onClick={() => void handleCompletar(mantenimiento)}
                      >
                        Completar
                      </button>
                    )}
                    {permisos.configurar && (
                      <button
                        type="button"
                        className="eq-btn eq-btn--sm eq-btn--danger"
                        onClick={() => void handleEliminar(mantenimiento)}
                      >
                        Eliminar
                      </button>
                    )}
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
