import { useMemo, useRef, type FormEvent } from 'react'
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

const CATEGORIAS_DISPONIBLES = [
  'Alimento',
  'Pollitos',
  'Medicamentos',
  'Insumos',
  'Servicios',
  'Otro',
] as const

function FormularioProveedor({ form, modoEdicion, guardando, error, onCambiar, onGuardar, onCerrar }: Props) {
  const nombreRef = useRef<HTMLInputElement>(null)

  const categoriasSeleccionadas = useMemo(() => {
    if (!form.tipo_proveedor) return []
    return form.tipo_proveedor
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
  }, [form.tipo_proveedor])

  const alternarCategoria = (cat: string) => {
    let nuevas: string[]
    if (categoriasSeleccionadas.includes(cat)) {
      nuevas = categoriasSeleccionadas.filter((c) => c !== cat)
    } else {
      nuevas = [...categoriasSeleccionadas, cat]
    }
    onCambiar('tipo_proveedor', nuevas.join(', '))
  }

  return (
    <Modal
      titulo={modoEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
      subtitulo="Registra la información principal. Los demás datos pueden completarse después."
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
          <span>Nombre o razón social</span>
          <input
            ref={nombreRef}
            value={form.nombre}
            onChange={(evento) => onCambiar('nombre', evento.target.value)}
            placeholder="Ej. Alimentos del Campo S.A.S"
            autoComplete="organization"
            required
          />
        </label>

        <label className="modal-campo">
          <span>NIT</span>
          <input
            value={form.nit}
            onChange={(evento) => onCambiar('nit', evento.target.value)}
            placeholder="Ej. 900123456-7"
            inputMode="numeric"
            required
          />
        </label>

        <div className="modal-campo">
          <span>Categorías del proveedor <em>(Opcional, puedes seleccionar varias)</em></span>
          <div className="prv-chips-categorias" role="group" aria-label="Categorías del proveedor">
            {CATEGORIAS_DISPONIBLES.map((cat) => {
              const activa = categoriasSeleccionadas.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  className={`prv-chip-categoria ${activa ? 'prv-chip-categoria--activo' : ''}`}
                  onClick={() => alternarCategoria(cat)}
                  aria-pressed={activa}
                >
                  {activa ? '✓ ' : '+ '}{cat}
                </button>
              )
            })}
          </div>
          <small className="modal-ayuda">
            Permite filtrar insumos en compras y asignación de proveedores al crear lotes.
          </small>
        </div>

        <label className="modal-campo">
          <span>Persona de contacto <em>(Opcional)</em></span>
          <input
            value={form.contacto_persona}
            onChange={(evento) => onCambiar('contacto_persona', evento.target.value)}
            placeholder="Ej. Carlos Rodríguez"
            autoComplete="name"
          />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Teléfono <em>(Opcional)</em></span>
            <input
              value={form.telefono}
              onChange={(evento) => onCambiar('telefono', evento.target.value)}
              placeholder="Ej. 300 123 4567"
              autoComplete="tel"
              inputMode="tel"
            />
          </label>
          <label className="modal-campo">
            <span>Correo electrónico <em>(Opcional)</em></span>
            <input
              type="email"
              value={form.email}
              onChange={(evento) => onCambiar('email', evento.target.value)}
              placeholder="ventas@proveedor.com"
              autoComplete="email"
            />
          </label>
        </div>

        <label className="modal-campo">
          <span>Dirección <em>(Opcional)</em></span>
          <input
            value={form.direccion}
            onChange={(evento) => onCambiar('direccion', evento.target.value)}
            placeholder="Ej. Km 4 Vía Panamericana"
            autoComplete="street-address"
          />
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioProveedor
