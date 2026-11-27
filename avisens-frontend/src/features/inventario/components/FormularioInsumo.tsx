import type { FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { Granja } from '@features/granjas/api/granjas'
import type { FormularioInsumoDatos } from '../model/formularioInsumo'

const ID_FORMULARIO = 'formulario-insumo'

interface Props {
  form: FormularioInsumoDatos
  granjas: Granja[]
  modoEdicion: boolean
  guardando: boolean
  error: string
  onCambiar: <K extends keyof FormularioInsumoDatos>(
    campo: K,
    valor: FormularioInsumoDatos[K],
  ) => void
  onGuardar: () => void
  onCerrar: () => void
}

function FormularioInsumo({
  form,
  granjas,
  modoEdicion,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const puedeGuardar =
    form.nombre.trim() !== '' && form.unidad_medida.trim() !== '' && form.granja_id > 0

  function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!guardando && puedeGuardar) onGuardar()
  }

  return (
    <Modal
      variante="lateral"
      titulo={modoEdicion ? 'Editar insumo' : 'Nuevo insumo'}
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
            disabled={guardando || !puedeGuardar}
          >
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar' : 'Agregar insumo'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={manejarSubmit}>
      {!modoEdicion && (
        <label className="modal-campo">
          <span>Granja</span>
          <select
            value={form.granja_id || ''}
            onChange={(evento) => onCambiar('granja_id', Number(evento.target.value))}
            required
          >
            <option value="" disabled>
              {granjas.length === 0 ? 'No hay granjas disponibles' : 'Elige una granja'}
            </option>
            {granjas.map((granja) => (
              <option key={granja.id} value={granja.id}>
                {granja.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="modal-fila">
        <label className="modal-campo">
          <span>Nombre</span>
          <input
            value={form.nombre}
            onChange={(evento) => onCambiar('nombre', evento.target.value)}
            placeholder="Alimento iniciación"
            maxLength={120}
            required
          />
        </label>
        <label className="modal-campo">
          <span>Unidad de medida</span>
          <input
            value={form.unidad_medida}
            onChange={(evento) => onCambiar('unidad_medida', evento.target.value)}
            placeholder="kg"
            maxLength={30}
            required
          />
        </label>
      </div>

      <div className="modal-fila">
        <label className="modal-campo">
          <span>
            Tipo <em>(opcional)</em>
          </span>
          <input
            value={form.tipo}
            onChange={(evento) => onCambiar('tipo', evento.target.value)}
            placeholder="alimento, sanitario, cama…"
            maxLength={60}
          />
        </label>
        <label className="modal-campo">
          <span>Stock mínimo</span>
          <input
            type="number"
            min="0"
            max="10000000"
            step="0.001"
            inputMode="decimal"
            value={form.stock_minimo}
            onChange={(evento) => onCambiar('stock_minimo', evento.target.value)}
          />
        </label>
      </div>

      {!modoEdicion && (
        <label className="modal-campo">
          <span>
            Stock inicial <em>(después solo cambia con movimientos)</em>
          </span>
          <input
            type="number"
            min="0"
            max="10000000"
            step="0.001"
            inputMode="decimal"
            value={form.stock_actual}
            onChange={(evento) => onCambiar('stock_actual', evento.target.value)}
          />
        </label>
      )}

      <div className="modal-fila">
        <label className="modal-campo">
          <span>
            Precio unitario COP <em>(opcional)</em>
          </span>
          <input
            type="number"
            min="0"
            max="10000000000"
            step="1"
            inputMode="numeric"
            value={form.precio_unitario_cop}
            onChange={(evento) => onCambiar('precio_unitario_cop', evento.target.value)}
          />
        </label>
        <label className="modal-campo">
          <span>
            Ubicación <em>(opcional)</em>
          </span>
          <input
            value={form.ubicacion_almacen}
            onChange={(evento) => onCambiar('ubicacion_almacen', evento.target.value)}
            placeholder="Bodega 1, estante A"
            maxLength={120}
          />
        </label>
      </div>

      <label className="modal-campo">
        <span>
          Fecha de vencimiento <em>(opcional)</em>
        </span>
        <input
          type="date"
          value={form.fecha_vencimiento}
          onChange={(evento) => onCambiar('fecha_vencimiento', evento.target.value)}
        />
      </label>

      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
      </form>
    </Modal>
  )
}

export default FormularioInsumo
