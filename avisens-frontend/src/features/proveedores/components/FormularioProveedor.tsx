import { useEffect, useRef, type FormEvent } from 'react'
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

function FormularioProveedor({ form, modoEdicion, guardando, error, onCambiar, onGuardar, onCerrar }: Props) {
  const nombreRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nombreRef.current?.focus()
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape' && !guardando) onCerrar()
    }
    window.addEventListener('keydown', cerrarConEscape)
    return () => window.removeEventListener('keydown', cerrarConEscape)
  }, [guardando, onCerrar])

  return (
    <div className="prv-modal-fondo" onMouseDown={onCerrar}>
      <section className="prv-modal" role="dialog" aria-modal="true" aria-labelledby="prv-modal-titulo" onMouseDown={(evento) => evento.stopPropagation()}>
        <header>
          <h2 id="prv-modal-titulo">{modoEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <p>Los campos marcados con * son obligatorios.</p>
        </header>

        <form onSubmit={onGuardar}>
          <label className="prv-campo">
            <span>Nombre o razón social *</span>
            <input ref={nombreRef} value={form.nombre} onChange={(evento) => onCambiar('nombre', evento.target.value)} autoComplete="organization" required />
          </label>

          <div className="prv-campos-dos">
            <label className="prv-campo">
              <span>NIT *</span>
              <input value={form.nit} onChange={(evento) => onCambiar('nit', evento.target.value)} inputMode="numeric" required />
            </label>
            <label className="prv-campo">
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

          <label className="prv-campo">
            <span>Persona de contacto</span>
            <input value={form.contacto_persona} onChange={(evento) => onCambiar('contacto_persona', evento.target.value)} autoComplete="name" />
          </label>

          <div className="prv-campos-dos">
            <label className="prv-campo">
              <span>Teléfono</span>
              <input value={form.telefono} onChange={(evento) => onCambiar('telefono', evento.target.value)} autoComplete="tel" inputMode="tel" />
            </label>
            <label className="prv-campo">
              <span>Correo electrónico</span>
              <input type="email" value={form.email} onChange={(evento) => onCambiar('email', evento.target.value)} autoComplete="email" />
            </label>
          </div>

          <label className="prv-campo">
            <span>Dirección</span>
            <input value={form.direccion} onChange={(evento) => onCambiar('direccion', evento.target.value)} autoComplete="street-address" />
          </label>

          {error && <p className="prv-error-formulario" role="alert">{error}</p>}

          <footer className="prv-modal-acciones">
            <button type="button" onClick={onCerrar} disabled={guardando}>Cancelar</button>
            <button type="submit" className="prv-boton-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear proveedor'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

export default FormularioProveedor
