import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import { validarTextoSeguro } from '@shared/utils/validacion'
import type { Insumo, RegistrarMovimientoPayload } from '../api/insumos'
import type { TipoMovimiento } from '../api/movimientos'

const ID_FORMULARIO = 'formulario-movimiento-inventario'

interface Props {
  insumo: Insumo
  // Los tipos que el rol puede registrar (permisosDeInsumo).
  tiposPermitidos: TipoMovimiento[]
  onRegistrar: (payload: RegistrarMovimientoPayload) => Promise<void>
  onCerrar: () => void
}

const OPCIONES: { valor: TipoMovimiento; etiqueta: string; ayuda: string }[] = [
  { valor: 'entrada', etiqueta: 'Entrada', ayuda: 'Suma al stock' },
  { valor: 'salida', etiqueta: 'Salida', ayuda: 'Resta del stock' },
  { valor: 'ajuste', etiqueta: 'Ajuste', ayuda: 'Fija el stock real contado' },
]

function FormularioMovimiento({ insumo, tiposPermitidos, onRegistrar, onCerrar }: Props) {
  const opciones = OPCIONES.filter((opcion) => tiposPermitidos.includes(opcion.valor))
  const soloSalida = opciones.length === 1 && opciones[0].valor === 'salida'
  const [tipo, setTipo] = useState<TipoMovimiento>(opciones[0]?.valor ?? 'salida')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cantidadNumero = Number(cantidad)
  const cantidadValida =
    cantidad.trim() !== '' &&
    Number.isFinite(cantidadNumero) &&
    cantidadNumero > 0 &&
    cantidadNumero <= 10_000_000

  // Una salida mayor que el stock dejaría la bodega en negativo; se avisa
  // antes de intentarlo en vez de esperar el error del servidor.
  const excedeStock = tipo === 'salida' && cantidadValida && cantidadNumero > insumo.stock_actual

  async function registrar() {
    if (!cantidadValida) {
      setError('Ingresa una cantidad mayor que cero y menor a 10.000.000.')
      return
    }
    const errorMotivo = validarTextoSeguro(motivo, 'El motivo', { max: 200 })
    if (errorMotivo) {
      setError(errorMotivo)
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
      variante="lateral"
      titulo={soloSalida ? 'Registrar salida' : 'Registrar movimiento'}
      subtitulo={`${insumo.nombre} · ${insumo.stock_actual.toLocaleString()} ${insumo.unidad_medida} en bodega`}
      onCerrar={onCerrar}
      bloqueado={guardando}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="submit"
            form={ID_FORMULARIO}
            className="modal-btn modal-btn--primary"
            disabled={guardando || !cantidadValida || excedeStock}
          >
            {guardando ? 'Registrando…' : 'Registrar'}
          </button>
        </>
      }
    >
      <form
        id={ID_FORMULARIO}
        onSubmit={(evento: FormEvent<HTMLFormElement>) => {
          evento.preventDefault()
          if (!guardando && cantidadValida && !excedeStock) void registrar()
        }}
      >
      {opciones.length > 1 && <div className="inv-tipos" role="radiogroup" aria-label="Tipo de movimiento">
        {opciones.map((opcion) => (
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
      </div>}

      <label className="modal-campo">
        <span>
          {tipo === 'ajuste'
            ? `Stock real contado (${insumo.unidad_medida})`
            : `Cantidad (${insumo.unidad_medida})`}
        </span>
        <input
          type="number"
          min="0.001"
          max="10000000"
          step="0.001"
          inputMode="decimal"
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
          placeholder={soloSalida ? 'Consumo del galpón 2, cambio de cama…' : 'Compra de insumo, consumo del galpón 2…'}
          maxLength={200}
        />
      </label>

      {cantidad.trim() !== '' && !cantidadValida && (
        <p className="modal-error" role="alert">
          Ingresa una cantidad mayor que cero y menor o igual a 10.000.000.
        </p>
      )}

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
      </form>
    </Modal>
  )
}

export default FormularioMovimiento
