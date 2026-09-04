import { useState, type FormEventHandler } from 'react'
import Modal from '@shared/ui/Modal/Modal'
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

const ID_FORMULARIO = 'formulario-galpon'

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
    <Modal
      titulo={modoEdicion ? 'Editar galpón' : 'Nuevo galpón'}
      subtitulo="El código se genera automáticamente. Solo completa los datos principales."
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
            {guardando ? 'Guardando…' : modoEdicion ? 'Guardar cambios' : 'Crear galpón'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={onGuardar}>
        <div className="modal-fila">
          <label className="modal-campo">
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
          <label className="modal-campo">
            <span>Nombre *</span>
            <input
              value={form.nombre}
              onChange={(evento) => onCambiar('nombre', evento.target.value)}
              required
            />
          </label>
          <label className="modal-campo">
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
          className="modal-desplegar"
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
            className="modal-adicional"
          >
            <div className="modal-fila">
              <label className="modal-campo">
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
              <label className="modal-campo">
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
              <label className="modal-campo">
                <span>Orientación</span>
                <input
                  value={form.orientacion}
                  onChange={(evento) =>
                    onCambiar('orientacion', evento.target.value)
                  }
                />
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Tipo de techo</span>
                <input
                  value={form.tipo_techo}
                  onChange={(evento) =>
                    onCambiar('tipo_techo', evento.target.value)
                  }
                />
              </label>
              <label className="modal-campo">
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
          <p className="modal-error" role="alert">
            {error}
          </p>
        )}

      </form>
    </Modal>
  )
}

export default FormularioGalpon
