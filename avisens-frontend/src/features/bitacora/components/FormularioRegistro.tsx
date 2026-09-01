import { useEffect, useRef, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { FormularioRegistro as Datos, TipoRegistro } from '../model/bitacora'

type Props = {
  tipo: TipoRegistro
  form: Datos
  guardando: boolean
  error: string
  onCambiar: <K extends keyof Datos>(campo: K, valor: Datos[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-registro'

const TITULOS: Record<TipoRegistro, string> = {
  peso: 'Registrar pesaje',
  mortalidad: 'Registrar mortalidad',
  sanitario: 'Registrar evento sanitario',
}

const EVENTOS_SANITARIOS = [
  ['vacunacion', 'Vacunación'],
  ['medicacion', 'Medicación'],
  ['tratamiento', 'Tratamiento'],
  ['diagnostico', 'Diagnóstico'],
  ['revision', 'Revisión'],
] as const

function FormularioRegistro({ tipo, form, guardando, error, onCambiar, onGuardar, onCerrar }: Props) {
  const fechaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fechaRef.current?.focus()
  }, [])

  return (
    <Modal
      titulo={TITULOS[tipo]}
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
            {guardando ? 'Guardando…' : 'Guardar registro'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <label className="modal-campo">
          <span>Fecha *</span>
          <input
            ref={fechaRef}
            type="date"
            value={form.fecha}
            onChange={(evento) => onCambiar('fecha', evento.target.value)}
            required
          />
        </label>

        {tipo === 'peso' && (
          <>
            <label className="modal-campo">
              <span>Peso promedio (g) *</span>
              <input
                type="number"
                min="1"
                value={form.peso_promedio_g}
                onChange={(evento) => onCambiar('peso_promedio_g', evento.target.value)}
                required
              />
            </label>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Aves pesadas</span>
                <input
                  type="number"
                  min="1"
                  value={form.cantidad_aves_pesadas}
                  onChange={(evento) => onCambiar('cantidad_aves_pesadas', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Peso objetivo (g)</span>
                <input
                  type="number"
                  min="1"
                  value={form.peso_objetivo_g}
                  onChange={(evento) => onCambiar('peso_objetivo_g', evento.target.value)}
                />
              </label>
            </div>
          </>
        )}

        {tipo === 'mortalidad' && (
          <>
            <label className="modal-campo">
              <span>Aves fallecidas *</span>
              <input
                type="number"
                min="1"
                value={form.cantidad_aves}
                onChange={(evento) => onCambiar('cantidad_aves', evento.target.value)}
                required
              />
            </label>
            <label className="modal-campo">
              <span>Causa probable</span>
              <input
                value={form.causa_presuntiva}
                onChange={(evento) => onCambiar('causa_presuntiva', evento.target.value)}
              />
            </label>
          </>
        )}

        {tipo === 'sanitario' && (
          <>
            <label className="modal-campo">
              <span>Tipo de evento *</span>
              <select
                value={form.tipo}
                onChange={(evento) => onCambiar('tipo', evento.target.value)}
              >
                {EVENTOS_SANITARIOS.map(([valor, etiqueta]) => (
                  <option key={valor} value={valor}>
                    {etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="modal-campo">
              <span>Producto o vacuna</span>
              <input
                value={form.producto}
                onChange={(evento) => onCambiar('producto', evento.target.value)}
              />
            </label>
            <label className="modal-campo">
              <span>Diagnóstico</span>
              <input
                value={form.diagnostico}
                onChange={(evento) => onCambiar('diagnostico', evento.target.value)}
              />
            </label>
          </>
        )}

        <label className="modal-campo">
          <span>Observaciones</span>
          <textarea
            rows={3}
            value={form.observaciones}
            onChange={(evento) => onCambiar('observaciones', evento.target.value)}
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

export default FormularioRegistro
