import { useMemo, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { Granja } from '@features/granjas/api/granjas'
import type { Lote } from '@features/lotes/api/lotes'
import type { Proveedor } from '@features/proveedores/api/proveedores'
import type { FormularioOrden as DatosOrden } from '../model/ordenCompra'

type Props = {
  form: DatosOrden
  granjas: Granja[]
  proveedores: Proveedor[]
  lotes: Lote[]
  guardando: boolean
  error: string
  onCambiar: <K extends keyof DatosOrden>(campo: K, valor: DatosOrden[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-orden'

function FormularioOrden({
  form,
  granjas,
  proveedores,
  lotes,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const lotesDeGranja = useMemo(
    () => lotes.filter((lote) => String(lote.galpon.granja.id) === form.granja_id),
    [form.granja_id, lotes],
  )

  return (
    <Modal
      titulo="Nueva orden de compra"
      subtitulo="El código se genera automáticamente. Luego podrás agregar los insumos."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="submit"
            form={ID_FORMULARIO}
            className="modal-btn modal-btn--primary"
            disabled={guardando}
          >
            {guardando ? 'Creando…' : 'Crear orden'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <div className="modal-fila">
          <label className="modal-campo">
            <span>Granja *</span>
            <select
              value={form.granja_id}
              onChange={(evento) => {
                onCambiar('granja_id', evento.target.value)
                onCambiar('lote_id', '')
              }}
              required
            >
              <option value="">Selecciona una granja</option>
              {granjas.map((granja) => (
                <option key={granja.id} value={granja.id}>
                  {granja.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="modal-campo">
            <span>Proveedor *</span>
            <select
              value={form.proveedor_id}
              onChange={(evento) => onCambiar('proveedor_id', evento.target.value)}
              required
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="modal-campo">
          <span>Lote relacionado</span>
          <select
            value={form.lote_id}
            onChange={(evento) => onCambiar('lote_id', evento.target.value)}
            disabled={!form.granja_id}
          >
            <option value="">Compra general de la granja</option>
            {lotesDeGranja.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.codigo}
              </option>
            ))}
          </select>
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Fecha del pedido</span>
            <input
              type="date"
              value={form.fecha_pedido}
              onChange={(evento) => onCambiar('fecha_pedido', evento.target.value)}
            />
          </label>
          <label className="modal-campo">
            <span>Entrega estimada</span>
            <input
              type="date"
              value={form.fecha_entrega_estimada}
              onChange={(evento) => onCambiar('fecha_entrega_estimada', evento.target.value)}
              min={form.fecha_pedido}
            />
          </label>
        </div>

        {error && (
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}

export default FormularioOrden
