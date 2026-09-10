import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type {
  CatalogoSensor,
  CrearCatalogoSensorPayload,
} from '@features/sensores/api/catalogoSensores'

type Props = {
  editando: CatalogoSensor | null
  onGuardar: (payload: CrearCatalogoSensorPayload, editandoId: number | null) => Promise<void>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-sensor-catalogo'

type Campos = {
  tipo_sensor: string
  nombre: string
  descripcion: string
  precio_unitario_cop: string
  cobertura_m2: string
  obligatorio: boolean
}

function camposIniciales(sensor: CatalogoSensor | null): Campos {
  return {
    tipo_sensor: sensor?.tipo_sensor ?? '',
    nombre: sensor?.nombre ?? '',
    descripcion: sensor?.descripcion ?? '',
    precio_unitario_cop: sensor === null ? '' : String(sensor.precio_unitario_cop),
    cobertura_m2:
      sensor?.cobertura_m2 === null || sensor === null ? '' : String(sensor.cobertura_m2),
    obligatorio: sensor?.obligatorio ?? true,
  }
}

function FormularioSensor({ editando, onGuardar, onCerrar }: Props) {
  const [form, setForm] = useState<Campos>(() => camposIniciales(editando))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar<K extends keyof Campos>(campo: K, valor: Campos[K]) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!form.tipo_sensor.trim() || !form.nombre.trim()) {
      setError('El tipo y el nombre son obligatorios.')
      return
    }
    const precio = Number(form.precio_unitario_cop)
    if (form.precio_unitario_cop === '' || Number.isNaN(precio) || precio < 0) {
      setError('El precio debe ser un número igual o mayor que cero.')
      return
    }
    const cobertura = form.cobertura_m2 === '' ? null : Number(form.cobertura_m2)
    if (cobertura !== null && cobertura < 0.01) {
      setError('La cobertura debe ser al menos 0,01 m².')
      return
    }

    const payload: CrearCatalogoSensorPayload = {
      tipo_sensor: form.tipo_sensor.trim(),
      nombre: form.nombre.trim(),
      precio_unitario_cop: precio,
      obligatorio: form.obligatorio,
    }
    if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim()
    if (cobertura !== null) payload.cobertura_m2 = cobertura

    setGuardando(true)
    setError('')
    try {
      await onGuardar(payload, editando?.id ?? null)
      onCerrar()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo guardar el sensor.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo={editando ? 'Editar sensor del catálogo' : 'Nuevo sensor del catálogo'}
      subtitulo="Estos son los modelos que se pueden instalar en un galpón, con su precio de referencia."
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear sensor'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <label className="modal-campo">
          <span>Tipo de sensor</span>
          <input
            value={form.tipo_sensor}
            onChange={(e) => cambiar('tipo_sensor', e.target.value)}
            required
            autoFocus={editando === null}
            disabled={editando !== null}
          />
          {editando !== null && (
            <small className="modal-ayuda">
              El tipo identifica al sensor en todo el sistema y no se puede cambiar
              una vez creado.
            </small>
          )}
        </label>

        <label className="modal-campo">
          <span>Nombre</span>
          <input value={form.nombre} onChange={(e) => cambiar('nombre', e.target.value)} required />
        </label>

        <label className="modal-campo">
          <span>Descripción <em>(Opcional)</em></span>
          <input value={form.descripcion} onChange={(e) => cambiar('descripcion', e.target.value)} maxLength={200} />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Precio unitario en pesos</span>
            <input type="number" min="0" step="1" value={form.precio_unitario_cop} onChange={(e) => cambiar('precio_unitario_cop', e.target.value)} required />
          </label>
          <label className="modal-campo">
            <span>Cobertura en m² <em>(Opcional)</em></span>
            <input type="number" min="0.01" step="0.01" value={form.cobertura_m2} onChange={(e) => cambiar('cobertura_m2', e.target.value)} />
          </label>
        </div>

        <label className="modal-campo modal-campo--check">
          <input type="checkbox" checked={form.obligatorio} onChange={(e) => cambiar('obligatorio', e.target.checked)} />
          <span>Obligatorio al equipar un galpón</span>
        </label>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioSensor
