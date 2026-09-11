import { useState, type FormEvent } from 'react'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import type { ActualizarSensorPayload, Sensor } from '../api/sensores'
import type { DatosSensor } from '../model/sensor'

type Props = {
  sensor: Sensor
  onGuardar: (id: number, payload: ActualizarSensorPayload) => Promise<unknown>
  onCerrar: () => void
}

const ID_FORMULARIO = 'formulario-editar-sensor'

function FormularioSensor({ sensor, onGuardar, onCerrar }: Props) {
  const [form, setForm] = useState<DatosSensor>({
    codigo: sensor.codigo,
    tipo: sensor.tipo,
    unidad_medida: sensor.unidad_medida,
    modelo: sensor.modelo ?? '',
    fabricante: sensor.fabricante ?? '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function cambiar(campo: keyof DatosSensor, valor: string) {
    setForm((actual) => ({ ...actual, [campo]: valor }))
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!form.codigo.trim() || !form.tipo.trim() || !form.unidad_medida.trim()) {
      setError('El código, el tipo y la unidad son obligatorios.')
      return
    }

    // Los opcionales vacíos viajan como cadena vacía a propósito: aquí sí
    // significa «bórralo», al contrario que al crear, donde omitirlos quiere
    // decir «no lo sé todavía».
    const payload: ActualizarSensorPayload = {
      codigo: form.codigo.trim(),
      tipo: form.tipo.trim(),
      unidad_medida: form.unidad_medida.trim(),
      modelo: form.modelo.trim(),
      fabricante: form.fabricante.trim(),
    }

    setGuardando(true)
    setError('')
    try {
      await onGuardar(sensor.id, payload)
      onCerrar()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo guardar el sensor.'))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      titulo="Editar sensor"
      subtitulo={`${sensor.galpon.nombre} · ${sensor.dispositivo.nombre}`}
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            Cancelar
          </button>
          <button type="submit" form={ID_FORMULARIO} className="modal-btn modal-btn--primary" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <form id={ID_FORMULARIO} onSubmit={(evento) => void enviar(evento)}>
        <label className="modal-campo">
          <span>Código</span>
          <input value={form.codigo} onChange={(e) => cambiar('codigo', e.target.value)} required autoFocus />
        </label>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Tipo</span>
            <input value={form.tipo} onChange={(e) => cambiar('tipo', e.target.value)} required />
          </label>
          <label className="modal-campo">
            <span>Unidad de medida</span>
            <input value={form.unidad_medida} onChange={(e) => cambiar('unidad_medida', e.target.value)} required />
          </label>
        </div>

        <div className="modal-fila">
          <label className="modal-campo">
            <span>Modelo <em>(Opcional)</em></span>
            <input value={form.modelo} onChange={(e) => cambiar('modelo', e.target.value)} />
          </label>
          <label className="modal-campo">
            <span>Fabricante <em>(Opcional)</em></span>
            <input value={form.fabricante} onChange={(e) => cambiar('fabricante', e.target.value)} />
          </label>
        </div>

        <p className="modal-ayuda">
          El galpón y el dispositivo no se cambian aquí: mover un sensor de sitio
          dejaría sus mediciones anteriores atribuidas al galpón equivocado.
        </p>

        {error && <p className="modal-error" role="alert">{error}</p>}
      </form>
    </Modal>
  )
}

export default FormularioSensor
