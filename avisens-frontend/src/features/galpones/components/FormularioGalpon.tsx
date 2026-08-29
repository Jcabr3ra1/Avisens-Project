import { useState, type FormEventHandler, type MouseEvent } from 'react'
import type { Granja } from '@features/granjas/api/granjas'
import type { FormularioGalponDatos } from '../model/formularioGalpon'

interface Props {
  form: FormularioGalponDatos
  modoEdicion: boolean
  granjas: Granja[]
  guardando: boolean
  error: string
  onCambiar: <K extends keyof FormularioGalponDatos>(
    campo: K,
    valor: FormularioGalponDatos[K],
  ) => void
  onGuardar: FormEventHandler<HTMLFormElement>
  onCerrar: () => void
}

function numeroOpcional(valor: string): number | '' {
  return valor === '' ? '' : Number(valor)
}

function detenerPropagacion(evento: MouseEvent<HTMLDivElement>) {
  evento.stopPropagation()
}

function FormularioGalpon({
  form,
  modoEdicion,
  granjas,
  guardando,
  error,
  onCambiar,
  onGuardar,
  onCerrar,
}: Props) {
  const [mostrarAdicional, setMostrarAdicional] = useState(modoEdicion)

  return (
    <div className="galpones-modal" role="presentation" onClick={onCerrar}>
      <div
        className="galpones-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="formulario-galpon-titulo"
        onClick={detenerPropagacion}
      >
        <h2 id="formulario-galpon-titulo">
          {modoEdicion ? 'Editar galpón' : 'Nuevo galpón'}
        </h2>
        <p className="galpones-form-ayuda">
          El código se genera automáticamente. Solo completa los datos
          principales.
        </p>
        <form onSubmit={onGuardar}>
          <div className="galpones-form-fila">
            <label>
              <span>Granja *</span>
              <select
                value={form.granja_id}
                onChange={(evento) =>
                  onCambiar('granja_id', Number(evento.target.value))
                }
                disabled={modoEdicion}
                required
                autoFocus
              >
                {granjas.map((granja) => (
                  <option key={granja.id} value={granja.id}>
                    {granja.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Nombre *</span>
              <input
                value={form.nombre}
                onChange={(evento) => onCambiar('nombre', evento.target.value)}
                required
              />
            </label>
            <label>
              <span>
                Capacidad de aves <em>(opcional)</em>
              </span>
              <input
                type="number"
                min="1"
                value={form.capacidad_aves}
                onChange={(evento) =>
                  onCambiar(
                    'capacidad_aves',
                    numeroOpcional(evento.target.value),
                  )
                }
              />
            </label>
          </div>

          <button
            type="button"
            className="galpones-form-desplegar"
            aria-expanded={mostrarAdicional}
            aria-controls="galpones-informacion-adicional"
            onClick={() => setMostrarAdicional((visible) => !visible)}
          >
            {mostrarAdicional
              ? '− Ocultar información adicional'
              : '+ Agregar información adicional'}
          </button>

          {mostrarAdicional && (
            <div
              id="galpones-informacion-adicional"
              className="galpones-form-adicional"
            >
              <div className="galpones-form-fila">
                <label>
                  <span>Ancho en metros</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.ancho_metros}
                    onChange={(evento) =>
                      onCambiar(
                        'ancho_metros',
                        numeroOpcional(evento.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Largo en metros</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.largo_metros}
                    onChange={(evento) =>
                      onCambiar(
                        'largo_metros',
                        numeroOpcional(evento.target.value),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Orientación</span>
                  <input
                    value={form.orientacion}
                    onChange={(evento) =>
                      onCambiar('orientacion', evento.target.value)
                    }
                  />
                </label>
              </div>
              <div className="galpones-form-fila">
                <label>
                  <span>Tipo de techo</span>
                  <input
                    value={form.tipo_techo}
                    onChange={(evento) =>
                      onCambiar('tipo_techo', evento.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Fecha de construcción</span>
                  <input
                    type="date"
                    value={form.fecha_construccion}
                    onChange={(evento) =>
                      onCambiar('fecha_construccion', evento.target.value)
                    }
                  />
                </label>
              </div>
              <label className="galpones-form-ancho">
                <span>URL del plano</span>
                <input
                  type="url"
                  value={form.plano_url}
                  onChange={(evento) =>
                    onCambiar('plano_url', evento.target.value)
                  }
                />
              </label>
            </div>
          )}

          {error && (
            <p className="galpones-form-error" role="alert">
              {error}
            </p>
          )}

          <div className="galpones-form-acciones">
            <button type="button" onClick={onCerrar} disabled={guardando}>
              Cancelar
            </button>
            <button
              type="submit"
              className="galpones-btn-primary"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando…'
                : modoEdicion
                  ? 'Guardar cambios'
                  : 'Crear galpón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FormularioGalpon
