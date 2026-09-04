import { useState } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type { Insumo, RegistrarMovimientoPayload } from '../api/insumos'
import type { TipoMovimiento } from '../api/movimientos'

interface Props {
  insumo: Insumo
  onRegistrar: (payload: RegistrarMovimientoPayload) => Promise<void>
  onCerrar: () => void
}

const OPCIONES: { valor: TipoMovimiento; etiqueta: string; ayuda: string }[] = [
  { valor: 'entrada', etiqueta: 'Entrada', ayuda: 'Suma al stock' },
  { valor: 'salida', etiqueta: 'Salida', ayuda: 'Resta del stock' },
  { valor: 'ajuste', etiqueta: 'Ajuste', ayuda: 'Fija el stock real contado' },
]

function FormularioMovimiento({ insumo, onRegistrar, onCerrar }: Props) {
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cantidadNumero = Number(cantidad)
  const cantidadValida = cantidad.trim() !== '' && Number.isFinite(cantidadNumero) && cantidadNumero > 0

  // Una salida mayor que el stock dejaría la bodega en negativo; se avisa
  // antes de intentarlo en vez de esperar el error del servidor.
  const excedeStock = tipo === 'salida' && cantidadValida && cantidadNumero > insumo.stock_actual

  async function registrar() {
    if (!cantidadValida) {
      setError('Ingresa una cantidad mayor que cero.')
      return
    }
    setGuardando(true)
    setError('')
    try {
      await onRegistrar({
        tipo_movimiento: tipo,
        cantidad: cantidadNumero,
        motivo: motivo.trim() || undefined,
      })
      onCerrar()
    } catch (errorRegistro) {
      setError(mensajeDeError(errorRegistro, 'No se pudo registrar el movimiento.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Registrar movimiento"
      subtitulo={`${insumo.nombre} · ${insumo.stock_actual.toLocaleString()} ${insumo.unidad_medida} en bodega`}
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={registrar}
            disabled={guardando || !cantidadValida || excedeStock}
          >
            {guardando ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <div className="inv-tipos" role="radiogroup" aria-label="Tipo de movimiento">
        {OPCIONES.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={tipo === opcion.valor}
            className={`inv-tipo-opcion${tipo === opcion.valor ? ' is-activa' : ''}`}
            onClick={() => setTipo(opcion.valor)}
          >
            <strong>{opcion.etiqueta}</strong>
            <span>{opcion.ayuda}</span>
          </button>
        ))}
      </div>

      <label className="modal-campo">
        <span>
          {tipo === 'ajuste'
            ? `Stock real contado (${insumo.unidad_medida})`
            : `Cantidad (${insumo.unidad_medida})`}
        </span>
        <input
          type="number"
          min="0"
          step="0.001"
          value={cantidad}
          onChange={(evento) => setCantidad(evento.target.value)}
          required
        />
      </label>

      <label className="modal-campo">
        <span>
          Motivo <em>(opcional)</em>
        </span>
        <input
          value={motivo}
          onChange={(evento) => setMotivo(evento.target.value)}
          placeholder="Compra a proveedor, consumo del galpón 2…"
        />
      </label>

      {excedeStock && (
        <p className="modal-error" role="alert">
          La salida supera el stock disponible ({insumo.stock_actual.toLocaleString()}{' '}
          {insumo.unidad_medida}).
        </p>
      )}

      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}

export default FormularioMovimiento
