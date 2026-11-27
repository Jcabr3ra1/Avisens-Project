import { useState, type FormEvent, type FormEventHandler } from 'react'
import { IcBarn } from '@shared/ui/icons/icons'
import Modal from '@shared/ui/Modal/Modal'
import { validarNombreEntidad, validarTextoSeguro } from '@shared/utils/validacion'
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
  const [errorValidacion, setErrorValidacion] = useState('')
  const formularioBloqueado =
    guardando ||
    (esAdministrador && (cargandoPropietarios || Boolean(errorPropietarios)))

  function manejarSubmit(evento: FormEvent<HTMLFormElement>) {
    const errNombre = validarNombreEntidad(form.nombre, 'El nombre de la granja', { max: 120 })
    const errMunicipio = validarNombreEntidad(form.municipio ?? '', 'El municipio', { requerido: false, max: 100 })
    const errDepto = validarNombreEntidad(form.departamento ?? '', 'El departamento', { requerido: false, max: 100 })
    const errDir = validarTextoSeguro(form.direccion ?? '', 'La dirección', { max: 200 })
    let errNum: string | null = null
    if (form.latitud !== undefined && (form.latitud < -90 || form.latitud > 90)) {
      errNum = 'La latitud debe estar entre -90 y 90.'
    } else if (form.longitud !== undefined && (form.longitud < -180 || form.longitud > 180)) {
      errNum = 'La longitud debe estar entre -180 y 180.'
    } else if (form.area_total_m2 !== undefined && (form.area_total_m2 <= 0 || form.area_total_m2 > 5_000_000)) {
      errNum = 'El área total debe ser mayor que 0 y menor a 5.000.000 m².'
    }
    const primero = errNombre ?? errMunicipio ?? errDepto ?? errDir ?? errNum
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
      icono={<IcBarn size={20} />}
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
      <form id={ID_FORMULARIO} onSubmit={manejarSubmit}>
        {esAdministrador && (
          <label className="modal-campo">
            <span>Propietario</span>
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
          <span>Nombre</span>
          <input
            value={form.nombre}
            onChange={(evento) => onCambiar('nombre', evento.target.value)}
            placeholder="Granja La Esperanza"
            maxLength={120}
            required
          />
        </label>

        <label className="modal-campo">
          <span>
            Municipio <em>(Opcional)</em>
          </span>
          <input
            value={form.municipio ?? ''}
            onChange={(evento) => onCambiar('municipio', evento.target.value)}
            placeholder="Sabaneta"
            maxLength={100}
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
              <span>Dirección <em>(Opcional)</em></span>
              <input
                value={form.direccion ?? ''}
                maxLength={200}
                onChange={(evento) => onCambiar('direccion', evento.target.value)}
              />
            </label>
            <label className="modal-campo">
              <span>Departamento <em>(Opcional)</em></span>
              <input
                value={form.departamento ?? ''}
                maxLength={100}
                onChange={(evento) =>
                  onCambiar('departamento', evento.target.value)
                }
              />
            </label>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Latitud <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={form.latitud ?? ''}
                  onChange={(evento) =>
                    onCambiar('latitud', numeroOpcional(evento.target.value))
                  }
                />
              </label>
              <label className="modal-campo">
                <span>Longitud <em>(Opcional)</em></span>
                <input
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={form.longitud ?? ''}
                  onChange={(evento) =>
                    onCambiar('longitud', numeroOpcional(evento.target.value))
                  }
                />
              </label>
            </div>
            <label className="modal-campo">
              <span>Área total en m² <em>(Opcional)</em></span>
              <input
                type="number"
                min="0.01"
                max="5000000"
                step="any"
                value={form.area_total_m2 ?? ''}
                onChange={(evento) =>
                  onCambiar('area_total_m2', numeroOpcional(evento.target.value))
                }
              />
            </label>
          </div>
        )}

        {(errorValidacion || errorPropietarios || error) && (
          <p className="modal-error" role="alert">
            {errorValidacion || errorPropietarios || error}
          </p>
        )}
      </form>
    </Modal>
  )
}

export default FormularioGranja
