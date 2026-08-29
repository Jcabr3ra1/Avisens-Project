import { useState, type FormEventHandler, type MouseEvent } from 'react'
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

function numeroOpcional(valor: string): number | undefined {
  return valor === '' ? undefined : Number(valor)
}

function detenerPropagacion(evento: MouseEvent<HTMLDivElement>) {
  evento.stopPropagation()
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
    <div className="grj-modal" role="presentation" onClick={onCerrar}>
      <div
        className="grj-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formulario-granja-titulo"
        onClick={detenerPropagacion}
      >
        <h2 id="formulario-granja-titulo">
          {modoEdicion ? 'Editar granja' : 'Nueva granja'}
        </h2>
        <p className="grj-form-ayuda">
          Escribe los datos principales. Lo demás puedes completarlo cuando
          quieras.
        </p>
        <form onSubmit={onGuardar}>
          {esAdministrador && (
            <label>
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
          <label>
            <span>Nombre *</span>
            <input
              value={form.nombre}
              onChange={(evento) => onCambiar('nombre', evento.target.value)}
              required
              autoFocus
            />
          </label>
          <label>
            <span>
              Municipio <em>(opcional)</em>
            </span>
            <input
              value={form.municipio ?? ''}
              onChange={(evento) => onCambiar('municipio', evento.target.value)}
            />
          </label>
          <button
            type="button"
            className="grj-form-desplegar"
            aria-expanded={mostrarAdicional}
            aria-controls="grj-informacion-adicional"
            onClick={() => setMostrarAdicional((visible) => !visible)}
          >
            {mostrarAdicional
              ? '− Ocultar información adicional'
              : '+ Agregar información adicional'}
          </button>
          {mostrarAdicional && (
            <div id="grj-informacion-adicional" className="grj-form-adicional">
              <label>
                <span>Dirección</span>
                <input
                  value={form.direccion ?? ''}
                  onChange={(evento) =>
                    onCambiar('direccion', evento.target.value)
                  }
                />
              </label>
              <label>
                <span>Departamento</span>
                <input
                  value={form.departamento ?? ''}
                  onChange={(evento) =>
                    onCambiar('departamento', evento.target.value)
                  }
                />
              </label>
              <div className="grj-form-fila">
                <label>
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
                <label>
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
              <label>
                <span>Área total en m²</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.area_total_m2 ?? ''}
                  onChange={(evento) =>
                    onCambiar(
                      'area_total_m2',
                      numeroOpcional(evento.target.value),
                    )
                  }
                />
              </label>
            </div>
          )}
          {(errorPropietarios || error) && (
            <p className="grj-form-error" role="alert">
              {errorPropietarios || error}
            </p>
          )}
          <div className="grj-form-acciones">
            <button type="button" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="grj-btn-primary"
              disabled={formularioBloqueado}
            >
              {guardando
                ? 'Guardando…'
                : modoEdicion
                  ? 'Guardar cambios'
                  : 'Crear granja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioGranja
