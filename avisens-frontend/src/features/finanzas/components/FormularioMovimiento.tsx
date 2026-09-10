import type { FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { Granja } from '@features/granjas/api/granjas'
import type { Lote } from '@features/lotes/api/lotes'
import type { CategoriaFinanciera } from '../api/movimientos-financieros'
import {
  categoriasParaTipo,
  METODOS_PAGO,
  type FormularioMovimiento as DatosMovimiento,
} from '../model/movimiento'

type Props = {
  form: DatosMovimiento
  categorias: CategoriaFinanciera[]
  granjas: Granja[]
  lotes: Lote[]
  modoEdicion: boolean
  guardando: boolean
  error: string
  onCambiar: <K extends keyof DatosMovimiento>(campo: K, valor: DatosMovimiento[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-movimiento'

function FormularioMovimiento({
  form, categorias, granjas, lotes, modoEdicion, guardando, error,
  onCambiar, onGuardar, onCerrar,
}: Props) {
  const categoriasVisibles = categoriasParaTipo(categorias, form.tipo)
  // Solo se ofrecen los lotes de la granja elegida: un lote de otra granja es
  // una combinación que el backend rechaza.
  const lotesVisibles = form.granja_id
    ? lotes.filter((lote) => lote.galpon.granja.id === Number(form.granja_id))
    : []

  return (
    <Modal
      titulo={modoEdicion ? 'Editar movimiento' : 'Nuevo movimiento'}
      subtitulo="Registra un ingreso o un egreso de la operación. El lote es opcional."
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
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Registrar movimiento'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <fieldset className="modal-campo" disabled={guardando}>
          <legend>Tipo de movimiento</legend>
          <div className="fin-form-tipos">
            {(['egreso', 'ingreso'] as const).map((tipo) => (
              <label key={tipo} className="fin-form-tipo">
                <input
                  type="radio"
                  name="tipo-movimiento"
                  value={tipo}
                  checked={form.tipo === tipo}
                  onChange={() => {
                    onCambiar('tipo', tipo)
                    // La categoría elegida puede no valer para el otro tipo.
                    onCambiar('categoria_id', '')
                  }}
                />
                <span>{tipo === 'egreso' ? 'Egreso' : 'Ingreso'}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="modal-campo">
          <span>Categoría</span>
          <select
            value={form.categoria_id}
            onChange={(evento) => onCambiar('categoria_id', evento.target.value)}
            required
          >
            <option value="">Selecciona una categoría</option>
            {categoriasVisibles.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
            ))}
          </select>
          {categoriasVisibles.length === 0 && (
            <small className="modal-ayuda">
              No hay categorías disponibles para este tipo de movimiento.
            </small>
          )}
        </label>

        <label className="modal-campo">
          <span>Monto en pesos</span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.valor_cop}
            onChange={(evento) => onCambiar('valor_cop', evento.target.value)}
            required
          />
        </label>

        <label className="modal-campo">
          <span>Fecha</span>
          <input
            type="date"
            value={form.fecha}
            onChange={(evento) => onCambiar('fecha', evento.target.value)}
            required
          />
        </label>

        <label className="modal-campo">
          <span>Granja</span>
          <select
            value={form.granja_id}
            onChange={(evento) => {
              onCambiar('granja_id', evento.target.value)
              // Al cambiar de granja el lote anterior deja de pertenecerle.
              onCambiar('lote_id', '')
            }}
            required
          >
            <option value="">Selecciona una granja</option>
            {granjas.map((granja) => (
              <option key={granja.id} value={granja.id}>{granja.nombre}</option>
            ))}
          </select>
        </label>

        <label className="modal-campo">
          <span>Lote <small>(opcional)</small></span>
          <select
            value={form.lote_id}
            onChange={(evento) => onCambiar('lote_id', evento.target.value)}
            disabled={!form.granja_id}
          >
            <option value="">Sin lote asociado</option>
            {lotesVisibles.map((lote) => (
              <option key={lote.id} value={lote.id}>{lote.codigo}</option>
            ))}
          </select>
        </label>

        <label className="modal-campo">
          <span>Descripción <small>(opcional)</small></span>
          <input
            value={form.descripcion}
            onChange={(evento) => onCambiar('descripcion', evento.target.value)}
            maxLength={200}
          />
        </label>

        <label className="modal-campo">
          <span>Número de factura <small>(opcional)</small></span>
          <input
            value={form.numero_factura}
            onChange={(evento) => onCambiar('numero_factura', evento.target.value)}
            maxLength={60}
          />
        </label>

        <label className="modal-campo">
          <span>Método de pago <small>(opcional)</small></span>
          <select
            value={form.metodo_pago}
            onChange={(evento) => onCambiar('metodo_pago', evento.target.value)}
          >
            <option value="">Sin especificar</option>
            {METODOS_PAGO.map((metodo) => (
              <option key={metodo} value={metodo}>
                {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioMovimiento
