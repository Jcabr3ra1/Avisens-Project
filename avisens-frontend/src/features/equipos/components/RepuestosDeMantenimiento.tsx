import { useRef, useState, type FormEvent } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import { nuevaClaveIdempotencia } from '@shared/utils/idempotencia'
import { useRepuestos } from '../hooks/useRepuestos'
import type { MantenimientoRepuesto } from '../api/mantenimientos'

function RepuestosDeMantenimiento({ mantenimientoId }: { mantenimientoId: number }) {
  const { repuestos, insumos, cargando, error, agregar, revertir } =
    useRepuestos(mantenimientoId)
  const [insumoId, setInsumoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [revirtiendo, setRevirtiendo] = useState<number | null>(null)
  const [errorForm, setErrorForm] = useState('')
  // Identifica UN intento. Se conserva si el envío falla, para que reintentar
  // no descuente el stock dos veces, y se descarta al cambiar los datos.
  const claveIntento = useRef<string | null>(null)

  const insumo = insumos.find((i) => i.id === Number(insumoId))

  async function handleAgregar(e: FormEvent) {
    e.preventDefault()
    setErrorForm('')

    const unidades = Number(cantidad)
    if (!insumoId || !Number.isFinite(unidades) || unidades <= 0) {
      setErrorForm('Elige un insumo y una cantidad mayor que cero.')
      return
    }
    if (insumo && unidades > insumo.stock_actual) {
      setErrorForm(
        `Solo hay ${insumo.stock_actual} ${insumo.unidad_medida} en bodega.`,
      )
      return
    }

    claveIntento.current ??= nuevaClaveIdempotencia('repuesto')
    setGuardando(true)
    try {
      await agregar(Number(insumoId), unidades, claveIntento.current)
      claveIntento.current = null
      setInsumoId('')
      setCantidad('')
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo agregar el repuesto.'))
    } finally {
      setGuardando(false)
    }
  }

  async function handleRevertir(repuesto: MantenimientoRepuesto) {
    const confirmar = window.confirm(
      `¿Revertir ${repuesto.cantidad} ${repuesto.unidad_medida}?\n` +
        'La cantidad vuelve al stock de bodega.',
    )
    if (!confirmar) return
    setErrorForm('')
    setRevirtiendo(repuesto.id)
    try {
      await revertir(repuesto.id)
    } catch (err) {
      setErrorForm(mensajeDeError(err, 'No se pudo revertir el repuesto.'))
    } finally {
      setRevirtiendo(null)
    }
  }

  if (cargando) return <p className="eq-empty">Cargando repuestos…</p>

  return (
    <div className="eq-repuestos">
      {error && <p className="eq-alert eq-alert--error" role="alert">{error}</p>}

      {repuestos.length === 0 ? (
        <p className="eq-empty">Sin repuestos registrados.</p>
      ) : (
        <ul className="eq-repuestos-lista">
          {repuestos.map((repuesto) => (
            <li key={repuesto.id} className={repuesto.revertido ? 'is-revertido' : ''}>
              <span className="eq-repuesto-cant">
                {repuesto.cantidad} {repuesto.unidad_medida}
              </span>
              <span className="eq-repuesto-desc">
                {repuesto.descripcion ??
                  insumos.find((i) => i.id === repuesto.insumo_id)?.nombre ??
                  `Insumo ${repuesto.insumo_id}`}
              </span>
              {repuesto.revertido ? (
                <span className="eq-badge eq-badge--inactivo">revertido</span>
              ) : (
                <button
                  type="button"
                  className="eq-btn eq-btn--sm"
                  disabled={revirtiendo === repuesto.id}
                  onClick={() => void handleRevertir(repuesto)}
                >
                  {revirtiendo === repuesto.id ? 'Revirtiendo…' : 'Revertir'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="eq-repuesto-form" onSubmit={handleAgregar}>
        <select value={insumoId} onChange={(e) => { claveIntento.current = null; setInsumoId(e.target.value) }}>
          <option value="">Insumo de bodega…</option>
          {insumos.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre} ({item.stock_actual} {item.unidad_medida})
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          step="any"
          value={cantidad}
          onChange={(e) => { claveIntento.current = null; setCantidad(e.target.value) }}
          placeholder="Cantidad"
        />
        <button type="submit" className="eq-btn eq-btn--sm" disabled={guardando}>
          {guardando ? 'Agregando…' : 'Agregar'}
        </button>
      </form>

      {errorForm && <p className="eq-alert eq-alert--error" role="alert">{errorForm}</p>}
    </div>
  )
}

export default RepuestosDeMantenimiento
