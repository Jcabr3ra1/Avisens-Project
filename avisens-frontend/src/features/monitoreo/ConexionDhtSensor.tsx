import { useState } from 'react'
import { actualizarSensor, type Sensor } from '@features/sensores/api/sensores'
import { mensajeDeError } from '@shared/utils/errores'
import { GPIO_DHT22 } from './conexionDht'

export function OpcionesGpioDht() {
  return <>
    <option value="" disabled>Elige el GPIO de datos</option>
    {GPIO_DHT22.map(pin => <option key={pin} value={`gpio:${pin}`}>DHT22 · GPIO {pin}</option>)}
  </>
}

export default function ConexionDhtSensor({ sensor, alGuardar }: { sensor: Sensor; alGuardar: () => void }) {
  const [canal, setCanal] = useState(sensor.canal ?? '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  async function guardar() {
    if (!canal || guardando) return
    setGuardando(true)
    setError('')
    try {
      await actualizarSensor(sensor.id, { canal, modelo: 'DHT22' })
      alGuardar()
    } catch (problema) {
      setError(mensajeDeError(problema, 'No se pudo vincular la conexión.'))
    } finally {
      setGuardando(false)
    }
  }
  return <div className="mon-conexion">
    <label className="mon-contexto-campo">
      <span>Conexión física de {sensor.codigo}</span>
      <select value={canal} disabled={guardando} onChange={evento => setCanal(evento.target.value)}>
        <OpcionesGpioDht />
      </select>
    </label>
    <button type="button" className="mon-quitar" disabled={guardando || !canal || canal === sensor.canal} onClick={() => void guardar()}>
      {guardando ? 'Guardando…' : 'Vincular conexión'}
    </button>
    {error && <p className="mon-asignar-error" role="alert">{error}</p>}
  </div>
}
