import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { Insumo } from '@features/inventario/api/insumos'
import {
  AVES_MAXIMO,
  PESO_MAXIMO_G,
  PESO_MINIMO_G,
  VIAS_APLICACION,
  type FormularioRegistro as Datos,
  type TipoRegistro,
} from '../model/bitacora'

type Props = {
  tipo: TipoRegistro
  form: Datos
  guardando: boolean
  error: string
  onCambiar: <K extends keyof Datos>(campo: K, valor: Datos[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
  // Información de apoyo que se muestra dentro del formulario (no se envía).
  complemento?: ReactNode
  editando?: boolean
  // Vacunas y medicamentos de bodega que se pueden indicar en un evento sanitario.
  insumos?: Insumo[]
}

const ID_FORMULARIO = 'formulario-registro'

const TITULOS_EDICION: Record<TipoRegistro, string> = {
  peso: 'Corregir pesaje',
  mortalidad: 'Corregir mortalidad',
  sanitario: 'Corregir evento sanitario',
}

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

function FormularioRegistro({ tipo, form, guardando, error, onCambiar, onGuardar, onCerrar, editando = false, insumos = [] }: Props) {
  const fechaRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fechaRef.current?.focus()
  }, [])

  return (
    <Modal
      titulo={editando ? TITULOS_EDICION[tipo] : TITULOS[tipo]}
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
            {guardando ? 'Guardando…' : editando ? 'Guardar corrección' : 'Guardar registro'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <label className="modal-campo">
          <span>Fecha</span>
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
              <span>Peso promedio (g)</span>
              <input
                type="number"
                min={PESO_MINIMO_G}
                max={PESO_MAXIMO_G}
                value={form.peso_promedio_g}
                onChange={(evento) => onCambiar('peso_promedio_g', evento.target.value)}
                required
              />
            </label>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Aves pesadas <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="1"
                  max={AVES_MAXIMO}
                  value={form.cantidad_aves_pesadas}
                  onChange={(evento) => onCambiar('cantidad_aves_pesadas', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Peso objetivo (g) <em>(Opcional)</em></span>
                <input
                  type="number"
                  min={PESO_MINIMO_G}
                  max={PESO_MAXIMO_G}
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
              <span>Aves fallecidas</span>
              <input
                type="number"
                min="1"
                max={AVES_MAXIMO}
                value={form.cantidad_aves}
                onChange={(evento) => onCambiar('cantidad_aves', evento.target.value)}
                required
              />
            </label>
            <label className="modal-campo">
              <span>Causa probable <em>(Opcional)</em></span>
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
              <span>Tipo de evento</span>
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
              <span>Producto o vacuna <em>(Opcional)</em></span>
              <input
                value={form.producto}
                onChange={(evento) => onCambiar('producto', evento.target.value)}
              />
            </label>
            {insumos.length > 0 && (
              <label className="modal-campo">
                <span>Insumo de bodega <em>(Opcional)</em></span>
                <select
                  value={form.insumo_id}
                  onChange={(evento) => onCambiar('insumo_id', evento.target.value)}
                >
                  <option value="">No salió de bodega</option>
                  {insumos.map((insumo) => (
                    <option key={insumo.id} value={String(insumo.id)}>
                      {insumo.nombre} ({insumo.stock_actual.toLocaleString('es-CO')} {insumo.unidad_medida})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Dosis <em>(Opcional)</em></span>
                <input
                  value={form.dosis}
                  maxLength={100}
                  placeholder="Ej.: 0,5 ml por ave"
                  onChange={(evento) => onCambiar('dosis', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Vía de aplicación <em>(Opcional)</em></span>
                <select
                  value={form.via_aplicacion}
                  onChange={(evento) => onCambiar('via_aplicacion', evento.target.value)}
                >
                  <option value="">Sin indicar</option>
                  {VIAS_APLICACION.map(([valor, etiqueta]) => (
                    <option key={valor} value={valor}>{etiqueta}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Aves tratadas <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="1"
                  max={AVES_MAXIMO}
                  step="1"
                  inputMode="numeric"
                  value={form.cantidad_aves}
                  onChange={(evento) => onCambiar('cantidad_aves', evento.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Diagnóstico <em>(Opcional)</em></span>
                <input
                  value={form.diagnostico}
                  onChange={(evento) => onCambiar('diagnostico', evento.target.value)}
                />
              </label>
            </div>
          </>
        )}

        <label className="modal-campo">
          <span>Observaciones <em>(Opcional)</em></span>
          <textarea
            rows={3}
            style={{ resize: 'none' }}
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
