import { useEffect, useRef, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { Lote } from '@features/lotes/api/lotes'
import type { TipoAlimento } from '@features/consumos-diarios/api/tipos-alimento'
import type { FormularioConsumo as DatosConsumo } from '../model/consumoDiario'

type Props = {
  form: DatosConsumo
  lotes: Lote[]
  tiposAlimento: TipoAlimento[]
  modoEdicion: boolean
  guardando: boolean
  error: string
  onCambiar: <K extends keyof DatosConsumo>(campo: K, valor: DatosConsumo[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-consumo'

function FormularioConsumo({
  form,
  lotes,
  tiposAlimento,
  modoEdicion,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const loteRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    loteRef.current?.focus()
  }, [])

  return (
    <Modal
      titulo={modoEdicion ? 'Editar consumo' : 'Registrar consumo'}
      subtitulo="Registra alimento, agua o ambos."
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
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Registrar consumo'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <label className="modal-campo">
          <span>Lote *</span>
          <select
            ref={loteRef}
            value={form.lote_id}
            onChange={(evento) => onCambiar('lote_id', evento.target.value)}
            required
          >
            <option value="">Selecciona un lote</option>
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                {lote.codigo} · {lote.galpon.nombre}
              </option>
            ))}
          </select>
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Fecha *</span>
            <input
              type="date"
              value={form.fecha}
              onChange={(evento) => onCambiar('fecha', evento.target.value)}
              required
            />
          </label>
          <label className="modal-campo">
            <span>Tipo de alimento</span>
            <select
              value={form.tipo_alimento_id}
              onChange={(evento) => onCambiar('tipo_alimento_id', evento.target.value)}
            >
              <option value="">No se registró alimento</option>
              {tiposAlimento.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                  {tipo.etapa ? ` · ${tipo.etapa}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Alimento consumido (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={form.alimento_kg}
              onChange={(evento) => onCambiar('alimento_kg', evento.target.value)}
            />
          </label>
          <label className="modal-campo">
            <span>Agua consumida (litros)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.001"
              value={form.agua_litros}
              onChange={(evento) => onCambiar('agua_litros', evento.target.value)}
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

export default FormularioConsumo
