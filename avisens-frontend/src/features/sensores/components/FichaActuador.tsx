// FichaActuador.tsx — Ficha administrativa de un relé K1-K4.
//
// Dos partes que no se mezclan:
// - Identidad física (galpón, ESP32, canal, código interno, unidad): de solo
//   lectura. Cambiarla cambia a dónde llegan las órdenes remotas, así que no
//   se toca desde aquí; el backend además lo protege.
// - Datos administrativos (nombre, modelo, fabricante, fecha de instalación,
//   estado): los edita el administrador. Los opcionales pueden quedar vacíos.
//
// Los relés no se calibran: la ficha no muestra calibración.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import Modal from '@shared/ui/Modal/Modal'
import { mensajeDeError } from '@shared/utils/errores'
import {
  actualizarSensor,
  obtenerSensor,
  type ActualizarSensorPayload,
  type Sensor,
} from '../api/sensores'
import { etiquetaRele } from '../model/reles'
import {
  ESTADOS_ADMINISTRATIVOS,
  datosFicha,
  payloadFicha,
  validarFicha,
  type DatosFicha,
} from '../model/fichaActuador'
import './FichaActuador.css'

type Props = {
  sensorId: number
  puedeEditar: boolean
  onCerrar: () => void
  // Tras guardar, para refrescar listados.
  onGuardado?: (sensor: Sensor) => void
}

const ID_FORMULARIO = 'formulario-ficha-actuador'

const ETIQUETA_ESTADO: Record<string, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  mantenimiento: 'En mantenimiento',
  falla: 'Con falla',
}

function FichaActuador({ sensorId, puedeEditar, onCerrar, onGuardado }: Props) {
  const [sensor, setSensor] = useState<Sensor | null>(null)
  const [form, setForm] = useState<DatosFicha | null>(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [guardando, setGuardando] = useState(false)

  const cargar = useCallback(async () => {
    setErrorCarga('')
    try {
      const actual = await obtenerSensor(sensorId)
      setSensor(actual)
      setForm(datosFicha(actual))
    } catch (problema) {
      setErrorCarga(mensajeDeError(problema, 'No se pudo cargar la ficha del actuador.'))
    }
  }, [sensorId])

  useEffect(() => { void cargar() }, [cargar])

  function cambiar<K extends keyof DatosFicha>(campo: K, valor: DatosFicha[K]) {
    setForm((actual) => (actual ? { ...actual, [campo]: valor } : actual))
    setOk('')
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!sensor || !form || !puedeEditar) return
    const problema = validarFicha(form)
    if (problema) {
      setError(problema)
      return
    }
    const payload: ActualizarSensorPayload = payloadFicha(sensor, form)
    if (Object.keys(payload).length === 0) {
      setOk('No hay cambios que guardar.')
      return
    }
    setGuardando(true)
    setError('')
    setOk('')
    try {
      await actualizarSensor(sensor.id, payload)
      // Se vuelve a consultar: lo que se muestra es lo que quedó guardado.
      const guardado = await obtenerSensor(sensor.id)
      setSensor(guardado)
      setForm(datosFicha(guardado))
      setOk('Cambios guardados.')
      toast.success(`Ficha de ${guardado.tipo} actualizada.`)
      onGuardado?.(guardado)
    } catch (fallo) {
      setError(mensajeDeError(fallo, 'No se pudieron guardar los cambios.'))
    } finally {
      setGuardando(false)
    }
  }

  const rele = sensor ? etiquetaRele(sensor) : null

  return (
    <Modal
      titulo={sensor ? `Ficha del actuador · ${sensor.tipo}` : 'Ficha del actuador'}
      subtitulo={sensor ? `${sensor.galpon.nombre} · ${sensor.dispositivo.nombre}` : undefined}
      onCerrar={onCerrar}
      acciones={
        <>
          <button type="button" className="modal-btn" onClick={onCerrar} disabled={guardando}>
            {puedeEditar ? 'Cancelar' : 'Cerrar'}
          </button>
          {puedeEditar && (
            <button
              type="submit"
              form={ID_FORMULARIO}
              className="modal-btn modal-btn--primary"
              disabled={guardando || !form}
            >
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </button>
          )}
        </>
      }
    >
      {errorCarga ? (
        <div className="modal-error" role="alert">
          {errorCarga}{' '}
          <button type="button" className="fa-reintentar" onClick={() => void cargar()}>Reintentar</button>
        </div>
      ) : !sensor || !form ? (
        <p className="modal-ayuda" role="status">Cargando ficha…</p>
      ) : (
        <form id={ID_FORMULARIO} onSubmit={(evento) => void guardar(evento)}>
          <fieldset className="modal-seccion">
            <legend>Identidad física</legend>
            <dl className="fa-identidad">
              <div><dt>Galpón</dt><dd>{sensor.galpon.nombre}</dd></div>
              <div><dt>ESP32</dt><dd>{sensor.dispositivo.nombre} <code>{sensor.dispositivo.codigo_topic}</code></dd></div>
              <div>
                <dt>Canal</dt>
                <dd>
                  {sensor.canal
                    ? <>{rele ?? sensor.canal} <code>{sensor.canal}</code></>
                    : <span className="fa-alerta">Sin canal (registro antiguo{rele ? ` ${rele}` : ''})</span>}
                </dd>
              </div>
              <div><dt>Código interno</dt><dd><code>{sensor.codigo}</code></dd></div>
              <div><dt>Unidad</dt><dd>{sensor.unidad_medida}</dd></div>
            </dl>
            <p className="modal-ayuda">
              El ESP32 identifica el relé por su canal, no por el código ni por el nombre. Estos datos
              no se editan aquí: cambiarlos cambiaría a qué relé llegan las órdenes remotas.
              {!sensor.canal && ' Usa «Registrar relés» para asignarle su canal sin perder su historial.'}
            </p>
          </fieldset>

          <fieldset className="modal-seccion" disabled={!puedeEditar || guardando}>
            <legend>Datos administrativos</legend>
            <label className="modal-campo">
              <span>Nombre</span>
              <input
                value={form.nombre}
                onChange={(e) => cambiar('nombre', e.target.value)}
                maxLength={80}
                required
              />
            </label>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Modelo <em>(Opcional)</em></span>
                <input value={form.modelo} onChange={(e) => cambiar('modelo', e.target.value)} placeholder="SRD-05VDC-SL-C" />
              </label>
              <label className="modal-campo">
                <span>Fabricante <em>(Opcional)</em></span>
                <input value={form.fabricante} onChange={(e) => cambiar('fabricante', e.target.value)} placeholder="Songle" />
              </label>
            </div>
            <div className="modal-fila">
              <label className="modal-campo">
                <span>Fecha de instalación <em>(Opcional)</em></span>
                <input
                  type="date"
                  value={form.fecha_instalacion}
                  onChange={(e) => cambiar('fecha_instalacion', e.target.value)}
                />
              </label>
              <label className="modal-campo">
                <span>Estado administrativo</span>
                <select value={form.estado} onChange={(e) => cambiar('estado', e.target.value)}>
                  {ESTADOS_ADMINISTRATIVOS.map((estado) => (
                    <option key={estado} value={estado}>{ETIQUETA_ESTADO[estado]}</option>
                  ))}
                </select>
              </label>
            </div>
            {form.estado !== 'activo' && (
              <p className="modal-ayuda">
                Mientras no esté activo, la web no le envía órdenes y el monitoreo no cuenta sus lecturas.
              </p>
            )}
            {!puedeEditar && (
              <p className="modal-ayuda">Solo el administrador de AVISENS edita la ficha.</p>
            )}
          </fieldset>

          {error && <p className="modal-error" role="alert">{error}</p>}
          {ok && <p className="fa-ok" role="status">{ok}</p>}
        </form>
      )}
    </Modal>
  )
}

export default FichaActuador
