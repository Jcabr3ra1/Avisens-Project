import { useState, type FormEventHandler } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import type { CrearGranjaPayload, PropietarioGranja } from '../api/granjas'

interface Props {
  form: CrearGranjaPayload
  modoEdicion: boolean
  esAdministrador: boolean
  propietarios: PropietarioGranja[]
  cargandoPropietarios: boolean
  errorPropietarios: string
  guardando: boolean
  error: string
  onCambiar: (
    campo: keyof CrearGranjaPayload,
    valor: string | number | undefined,
  ) => void
  onGuardar: FormEventHandler<HTMLFormElement>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-granja'

function numeroOpcional(valor: string): number | undefined {
  return valor === '' ? undefined : Number(valor)
}

function FormularioGranja({
  form,
  modoEdicion,
  esAdministrador,
  propietarios,
  cargandoPropietarios,
  errorPropietarios,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const [mostrarAdicional, setMostrarAdicional] = useState(modoEdicion)
  const formularioBloqueado =
    guardando ||
    (esAdministrador && (cargandoPropietarios || Boolean(errorPropietarios)))

  return (
    <Modal
      titulo={modoEdicion ? 'Editar granja' : 'Nueva granja'}
      subtitulo="Escribe los datos principales. Lo demás puedes completarlo cuando quieras."
      onCerrar={onCerrar}
      acciones={
        <>
          <button
            type="button"
            className="modal-btn"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          {/* El botón vive en el pie y el formulario en el cuerpo, así que se
              enlazan por `form`: sin eso el submit no llegaría. */}
          <button
            type="submit"
            form={ID_FORMULARIO}
            className="modal-btn modal-btn--primary"
            disabled={formularioBloqueado}
          >
            {guardando
              ? 'Guardando…'
              : modoEdicion
                ? 'Guardar cambios'
                : 'Crear granja'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        {esAdministrador && (
          <label className="modal-campo">
            <span>Propietario *</span>
            <select
              value={form.propietario_id ?? ''}
              onChange={(evento) =>
                onCambiar(
                  'propietario_id',
                  evento.target.value === ''
                    ? undefined
                    : Number(evento.target.value),
                )
              }
              required
              disabled={cargandoPropietarios}
            >
              <option value="">
                {cargandoPropietarios
                  ? 'Cargando propietarios…'
                  : 'Selecciona un propietario'}
              </option>
              {propietarios.map((propietario) => (
                <option key={propietario.id} value={propietario.id}>
                  {propietario.nombre_completo}
                  {propietario.activo ? '' : ' (inactivo)'}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="modal-campo">
          <span>Nombre *</span>
          <input
            value={form.nombre}
            onChange={(evento) => onCambiar('nombre', evento.target.value)}
            placeholder="Granja La Esperanza"
            required
          />
        </label>

        <label className="modal-campo">
          <span>
            Municipio <em>(opcional)</em>
          </span>
          <input
            value={form.municipio ?? ''}
            onChange={(evento) => onCambiar('municipio', evento.target.value)}
            placeholder="Sabaneta"
          />
        </label>

        <button
          type="button"
          className="modal-desplegar"
          aria-expanded={mostrarAdicional}
          aria-controls="grj-informacion-adicional"
          onClick={() => setMostrarAdicional((visible) => !visible)}
        >
          {mostrarAdicional
            ? '− Ocultar información adicional'
            : '+ Agregar información adicional'}
        </button>

        {mostrarAdicional && (
          <div id="grj-informacion-adicional" className="modal-adicional">
            <label className="modal-campo">
              <span>Dirección</span>
              <input
                value={form.direccion ?? ''}
                onChange={(evento) => onCambiar('direccion', evento.target.value)}
              />
            </label>
            <label className="modal-campo">
              <span>Departamento</span>
              <input
                value={form.departamento ?? ''}
                onChange={(evento) =>
                  onCambiar('departamento', evento.target.value)
                }
              />
            </label>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Latitud</span>
                <input
                  type="number"
                  step="any"
                  value={form.latitud ?? ''}
                  onChange={(evento) =>
                    onCambiar('latitud', numeroOpcional(evento.target.value))
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Longitud</span>
                <input
                  type="number"
                  step="any"
                  value={form.longitud ?? ''}
                  onChange={(evento) =>
                    onCambiar('longitud', numeroOpcional(evento.target.value))
                  }
                />
              </label>
            </div>
            <label className="modal-campo">
              <span>Área total en m²</span>
              <input
                type="number"
                min="0"
                step="any"
                value={form.area_total_m2 ?? ''}
                onChange={(evento) =>
                  onCambiar('area_total_m2', numeroOpcional(evento.target.value))
                }
              />
            </label>
          </div>
        )}

        {(errorPropietarios || error) && (
          <p className="modal-error" role="alert">
            {errorPropietarios || error}
          </p>
        )}
      </form>
    </Modal>
  )
}

export default FormularioGranja
