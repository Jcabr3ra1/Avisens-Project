import Modal from '@shared/ui/Modal/Modal'
import type { Insumo } from '@features/inventario/api/insumos'
import type { Lote } from '@features/lotes/api/lotes'
import {
  TIPOS_EVENTO,
  VIAS_APLICACION,
  agruparInsumos,
  etiquetaDeLote,
  tipoUsaProducto,
  type FormularioMedicamentoDatos,
} from '../model/medicinas'

interface Props {
  form: FormularioMedicamentoDatos
  lotes: Lote[]
  insumos: Insumo[]
  modoEdicion: boolean
  guardando: boolean
  error: string
  onCambiar: <K extends keyof FormularioMedicamentoDatos>(
    campo: K,
    valor: FormularioMedicamentoDatos[K],
  ) => void
  onGuardar: () => void
  onCerrar: () => void
}

function FormularioMedicamento({
  form,
  lotes,
  insumos,
  modoEdicion,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const usaProducto = tipoUsaProducto(form.tipo)
  const loteElegido = lotes.find((lote) => lote.id === form.lote_id)
  const granjaId = loteElegido?.galpon.granja.id ?? 0
  const grupos = agruparInsumos(insumos, granjaId)

  function cambiarLote(loteId: number) {
    onCambiar('lote_id', loteId)
    const nuevaGranja = lotes.find((lote) => lote.id === loteId)?.galpon.granja.id ?? 0
    const insumoActual = insumos.find((insumo) => insumo.id === form.insumo_id)
    if (insumoActual && insumoActual.granja_id !== nuevaGranja) onCambiar('insumo_id', 0)
  }

  function cambiarInsumo(insumoId: number) {
    onCambiar('insumo_id', insumoId)
    const insumo = insumos.find((item) => item.id === insumoId)
    if (insumo) onCambiar('producto', insumo.nombre)
  }

  const puedeGuardar = form.lote_id > 0 && form.fecha !== ''

  return (
    <Modal
      titulo={modoEdicion ? 'Editar registro sanitario' : 'Registrar medicina'}
      subtitulo="Vacunas, medicación y revisiones que se le hacen a un lote."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={onGuardar}
            disabled={guardando || !puedeGuardar}
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <div className="modal-campo">
        <span>¿Qué se hizo?</span>
        <div className="med-tipos" role="group" aria-label="Tipo de registro">
          {TIPOS_EVENTO.map((tipo: (typeof TIPOS_EVENTO)[number]) => (
            <button
              key={tipo.valor}
              type="button"
              className={`med-tipo-opcion${form.tipo === tipo.valor ? ' is-activa' : ''}`}
              aria-pressed={form.tipo === tipo.valor}
              onClick={() => onCambiar('tipo', tipo.valor)}
            >
              <strong>{tipo.etiqueta}</strong>
              <span>{tipo.ayuda}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="modal-fila med-fila">
        <label className="modal-campo">
          <span>Lote</span>
          <select
            value={form.lote_id || ''}
            onChange={(evento) => cambiarLote(Number(evento.target.value))}
            required
          >
            <option value="" disabled>
              {lotes.length === 0 ? 'No hay lotes disponibles' : 'Elige un lote'}
            </option>
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {etiquetaDeLote(lote)}
              </option>
            ))}
          </select>
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
      </div>

      {usaProducto && (
        <>
          <label className="modal-campo">
            <span>
              Insumo de la bodega <em>(opcional)</em>
            </span>
            <select
              value={form.insumo_id || ''}
              onChange={(evento) => cambiarInsumo(Number(evento.target.value))}
              disabled={form.lote_id <= 0}
            >
              <option value="">
                {form.lote_id <= 0 ? 'Elige primero el lote' : 'Sin insumo de la bodega'}
              </option>
              {grupos.sanitarios.length > 0 && (
                <optgroup label="Sanitarios">
                  {grupos.sanitarios.map((insumo: Insumo) => (
                    <option key={insumo.id} value={insumo.id}>
                      {insumo.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
              {grupos.otros.length > 0 && (
                <optgroup label="Otros insumos">
                  {grupos.otros.map((insumo: Insumo) => (
                    <option key={insumo.id} value={insumo.id}>
                      {insumo.nombre}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <small className="modal-ayuda">
              Registrar la aplicación no descuenta el stock: la salida se anota en Bodega.
            </small>
          </label>

          <label className="modal-campo">
            <span>Producto aplicado</span>
            <input
              value={form.producto}
              onChange={(evento) => onCambiar('producto', evento.target.value)}
              placeholder="Vacuna Newcastle La Sota"
            />
          </label>

          <div className="modal-fila med-fila">
            <label className="modal-campo">
              <span>
                Dosis <em>(opcional)</em>
              </span>
              <input
                value={form.dosis}
                onChange={(evento) => onCambiar('dosis', evento.target.value)}
                placeholder="0.5 ml por ave"
              />
            </label>

            <label className="modal-campo">
              <span>
                Vía de aplicación <em>(opcional)</em>
              </span>
              <select
                value={form.via_aplicacion}
                onChange={(evento) => onCambiar('via_aplicacion', evento.target.value)}
              >
                <option value="">Sin definir</option>
                {VIAS_APLICACION.map((via: { valor: string; etiqueta: string }) => (
                  <option key={via.valor} value={via.valor}>
                    {via.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}

      <div className="modal-fila med-fila">
        <label className="modal-campo">
          <span>
            Aves atendidas <em>(opcional)</em>
          </span>
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.cantidad_aves}
            onChange={(evento) => onCambiar('cantidad_aves', evento.target.value)}
            placeholder="Todo el lote"
          />
        </label>

        <label className="modal-campo">
          <span>
            {form.tipo === 'diagnostico' ? 'Enfermedad diagnosticada' : 'Enfermedad o motivo'}
            {form.tipo !== 'diagnostico' && <em> (opcional)</em>}
          </span>
          <input
            value={form.diagnostico}
            onChange={(evento) => onCambiar('diagnostico', evento.target.value)}
            placeholder="Newcastle"
          />
        </label>
      </div>

      <label className="modal-campo">
        <span>
          Observaciones <em>(opcional)</em>
        </span>
        <textarea
          rows={3}
          value={form.observaciones}
          onChange={(evento) => onCambiar('observaciones', evento.target.value)}
          placeholder="Aplicada por la mañana antes del alimento"
        />
      </label>

      {error && (
        <p className="modal-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}

export default FormularioMedicamento
