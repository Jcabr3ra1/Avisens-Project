import { useRef, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { FormularioProveedor as DatosProveedor } from '../model/proveedor'

type Props = {
  form: DatosProveedor
  modoEdicion: boolean
  guardando: boolean
  error: string
  onCambiar: <K extends keyof DatosProveedor>(campo: K, valor: DatosProveedor[K]) => void
  onGuardar: (evento: FormEvent<HTMLFormElement>) => void
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-proveedor'

function FormularioProveedor({ form, modoEdicion, guardando, error, onCambiar, onGuardar, onCerrar }: Props) {
  const nombreRef = useRef<HTMLInputElement>(null)


  return (
    <Modal
      titulo={modoEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
      subtitulo="Los campos marcados con * son obligatorios."
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
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear proveedor'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <label className="modal-campo">
          <span>Nombre o razón social *</span>
          <input ref={nombreRef} value={form.nombre} onChange={(evento) => onCambiar('nombre', evento.target.value)} autoComplete="organization" required />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>NIT *</span>
            <input value={form.nit} onChange={(evento) => onCambiar('nit', evento.target.value)} inputMode="numeric" required />
          </label>
          <label className="modal-campo">
            <span>Tipo de proveedor</span>
            <select value={form.tipo_proveedor} onChange={(evento) => onCambiar('tipo_proveedor', evento.target.value)}>
              <option value="">Selecciona una opción</option>
              <option value="Alimento">Alimento</option>
              <option value="Pollitos">Pollitos</option>
              <option value="Insumos">Insumos</option>
              <option value="Medicamentos">Medicamentos</option>
              <option value="Servicios">Servicios</option>
              <option value="Otro">Otro</option>
            </select>
          </label>
        </div>

        <label className="modal-campo">
          <span>Persona de contacto</span>
          <input value={form.contacto_persona} onChange={(evento) => onCambiar('contacto_persona', evento.target.value)} autoComplete="name" />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Teléfono</span>
            <input value={form.telefono} onChange={(evento) => onCambiar('telefono', evento.target.value)} autoComplete="tel" inputMode="tel" />
          </label>
          <label className="modal-campo">
            <span>Correo electrónico</span>
            <input type="email" value={form.email} onChange={(evento) => onCambiar('email', evento.target.value)} autoComplete="email" />
          </label>
        </div>

        <label className="modal-campo">
          <span>Dirección</span>
          <input value={form.direccion} onChange={(evento) => onCambiar('direccion', evento.target.value)} autoComplete="street-address" />
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}

      </form>
    </Modal>
  )
}

export default FormularioProveedor
