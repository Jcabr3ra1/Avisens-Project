import { useState, type FormEvent, type FormEventHandler } from 'react'
import { IcGrid } from '@shared/ui/icons/icons'
import Modal from '@shared/ui/Modal/Modal'
import { validarNombreEntidad, validarTextoSeguro } from '@shared/utils/validacion'
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
  const [errorValidacion, setErrorValidacion] = useState('')

  function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    const errNombre = validarNombreEntidad(form.nombre, 'El nombre del galpón', { max: 120 })
    const errOri = validarTextoSeguro(form.orientacion, 'La orientación', { max: 60 })
    const errTecho = validarTextoSeguro(form.tipo_techo, 'El tipo de techo', { max: 80 })
    let errNum: string | null = null
    if (form.capacidad_aves !== '' && (!Number.isInteger(form.capacidad_aves) || form.capacidad_aves < 1 || form.capacidad_aves > 500_000)) {
      errNum = 'La capacidad de aves debe ser un entero entre 1 y 500.000.'
    } else if (form.ancho_metros !== '' && (form.ancho_metros <= 0 || form.ancho_metros > 1_000)) {
      errNum = 'El ancho debe ser mayor que 0 y menor a 1.000 metros.'
    } else if (form.largo_metros !== '' && (form.largo_metros <= 0 || form.largo_metros > 1_000)) {
      errNum = 'El largo debe ser mayor que 0 y menor a 1.000 metros.'
    }
    const primero = errNombre ?? errOri ?? errTecho ?? errNum
    if (primero) {
      evento.preventDefault()
      setErrorValidacion(primero)
      return
    }
    setErrorValidacion('')
    onGuardar(evento)
  }

  return (
    <Modal
      variante="lateral"
      icono={<IcGrid size={20} />}
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
      <form id={ID_FORMULARIO} onSubmit={manejarSubmit}>
        <div className="modal-fila">
          <label className="modal-campo">
            <span>Granja</span>
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
            <span>Nombre</span>
            <input
              value={form.nombre}
              onChange={(evento) => onCambiar('nombre', evento.target.value)}
              required
            />
          </label>
          <label className="modal-campo">
            <span>
              Capacidad de aves <em>(Opcional)</em>
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
                <span>Ancho en metros <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="0.1"
                  max="1000"
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
                <span>Largo en metros <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="0.1"
                  max="1000"
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
                <span>Orientación <em>(Opcional)</em></span>
                <input
                  value={form.orientacion}
                  maxLength={60}
                  onChange={(evento) =>
                    onCambiar('orientacion', evento.target.value)
                  }
                />
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Tipo de techo <em>(Opcional)</em></span>
                <input
                  value={form.tipo_techo}
                  maxLength={80}
                  onChange={(evento) =>
                    onCambiar('tipo_techo', evento.target.value)
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Fecha de construcción <em>(Opcional)</em></span>
                <input
                  type="date"
                  value={form.fecha_construccion}
                  onChange={(evento) =>
                    onCambiar('fecha_construccion', evento.target.value)
                  }
                />
              </label>
            </div>
          </div>
        )}

        {(errorValidacion || error) && (
          <p className="modal-error" role="alert">
            {errorValidacion || error}
          </p>
        )}

      </form>
    </Modal>
  )
}

export default FormularioGalpon
