// RelesDelGalpon.tsx — Administración de los relés K1-K4 de un galpón:
// «Registrar relés» para un ESP32 y la lista de actuadores con su ficha.
//
// El registro es idempotente y lo valida el backend (solo Administrador): aquí
// solo se elige el ESP32 y se muestra, canal por canal, qué pasó. El control
// (encender/apagar) no vive aquí: está en Monitoreo → Actuadores.
import { useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type { Dispositivo } from '@features/dispositivos/api/dispositivos'
import { registrarReles, type RegistroReles, type Sensor } from '../api/sensores'
import { esSensorRele, etiquetaRele, mensajeRegistroReles } from '../model/reles'
import FichaActuador from './FichaActuador'
import './RelesDelGalpon.css'

type Props = {
  galponId: number
  // Controladores activos del galpón.
  dispositivos: Dispositivo[]
  // Sensores del galpón (cualquier estado salvo retirado).
  sensores: Sensor[]
  puedeGestionar: boolean
  onCambio: () => void
}

const TEXTO_RESULTADO = {
  creado: 'Creado',
  asociado: 'Asociado (antiguo)',
  existente: 'Ya existía',
  conflicto: 'Conflicto',
} as const

// K1..K4 primero por canal y luego los antiguos sin canal.
function ordenRele(sensor: Sensor): string {
  return `${sensor.canal ? '0' : '1'}${etiquetaRele(sensor) ?? 'K9'}${sensor.dispositivo.codigo_topic}`
}

function RelesDelGalpon({ galponId, dispositivos, sensores, puedeGestionar, onCambio }: Props) {
  const [eleccion, setEleccion] = useState<number | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [resultado, setResultado] = useState<RegistroReles | null>(null)
  const [error, setError] = useState('')
  const [fichaId, setFichaId] = useState<number | null>(null)

  // Con un solo ESP32 activo no hace falta elegir.
  const dispositivoId = eleccion ?? (dispositivos.length === 1 ? dispositivos[0].id : null)
  const reles = useMemo(
    () => sensores.filter(esSensorRele).sort((a, b) => ordenRele(a).localeCompare(ordenRele(b))),
    [sensores],
  )
  const sinCanal = reles.filter((s) => !s.canal).length
  const mensaje = resultado ? mensajeRegistroReles(resultado) : null

  async function registrar() {
    if (!dispositivoId || registrando) return
    setRegistrando(true)
    setError('')
    setResultado(null)
    try {
      setResultado(await registrarReles(galponId, dispositivoId))
      onCambio()
    } catch (problema) {
      setError(mensajeDeError(problema, problema instanceof Error ? problema.message : 'No se pudieron registrar los relés.'))
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="rg">
      {puedeGestionar && (
        <div className="rg-registro">
          <label className="cs-campo">
            <span>ESP32</span>
            <select
              value={dispositivoId ?? ''}
              onChange={(e) => { setEleccion(Number(e.target.value)); setResultado(null); setError('') }}
              disabled={registrando || dispositivos.length === 0}
            >
              <option value="" disabled>{dispositivos.length ? 'Elige el ESP32' : 'Sin ESP32 activo'}</option>
              {dispositivos.map((d) => <option key={d.id} value={d.id}>{d.codigo_topic} · {d.nombre}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="cs-boton cs-boton--principal"
            onClick={() => void registrar()}
            disabled={!dispositivoId || registrando}
          >
            {registrando ? 'Registrando…' : 'Registrar relés'}
          </button>
          <p className="cs-nota rg-ayuda">
            Crea los relés K1-K4 que falten para ese ESP32, identificados por su canal. Si ya existen, no se
            duplican; los registros antiguos REL-K se asocian solo si no hay dudas y conservan su historial.
          </p>
        </div>
      )}

      {error && <p className="cs-aviso cs-aviso--error" role="alert">{error}</p>}
      {mensaje && resultado && (
        <div className={`cs-aviso${mensaje.tono === 'ok' ? ' cs-aviso--ok' : ''} rg-resultado`} role="status">
          <strong>{mensaje.titulo}</strong>
          <ul className="rg-canales" aria-label="Resultado por canal">
            {resultado.canales.map((c) => (
              <li key={c.canal}>
                <span className="rg-canal">{etiquetaRele({ canal: c.canal, codigo: '' }) ?? c.canal}</span>
                <span className="rg-nombre">{c.nombre}</span>
                <span className={`rg-chip rg-chip--${c.resultado}`}>{TEXTO_RESULTADO[c.resultado]}</span>
                {c.motivo && <small className="rg-motivo">{c.motivo}</small>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sinCanal > 0 && (
        <p className="cs-aviso" role="status">
          {sinCanal === 1 ? 'Un relé antiguo no tiene' : `${sinCanal} relés antiguos no tienen`} canal: el firmware
          nuevo no podrá controlarlos.{puedeGestionar ? ' Pulsa «Registrar relés» para asociarlos sin perder su historial.' : ''}
        </p>
      )}

      {reles.length === 0 ? (
        <p className="cs-nota">Este galpón todavía no tiene relés registrados.</p>
      ) : (
        <div className="cs-tabla-scroll">
          <table className="cs-tabla rg-tabla" aria-label="Actuadores del galpón">
            <thead>
              <tr>
                <th>Canal</th>
                <th>Actuador</th>
                <th>ESP32</th>
                <th>Código interno</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {reles.map((s) => (
                <tr key={s.id} className={s.estado === 'activo' ? undefined : 'is-inactivo'}>
                  <td>
                    {s.canal
                      ? <strong>{etiquetaRele(s)}</strong>
                      : <span className="rg-sin-canal">Sin canal</span>}
                  </td>
                  <td>
                    <span className="rg-actuador">
                      <strong>{s.tipo}</strong>
                      <small>{s.estado === 'activo' ? 'Activo' : s.estado}</small>
                    </span>
                  </td>
                  <td><code className="cs-codigo">{s.dispositivo.codigo_topic}</code></td>
                  <td><code className="cs-codigo">{s.codigo}</code></td>
                  <td className="cs-celda-acciones">
                    <button type="button" className="cs-accion" onClick={() => setFichaId(s.id)}>
                      {puedeGestionar ? 'Ficha / editar' : 'Ficha'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {fichaId !== null && (
        <FichaActuador
          sensorId={fichaId}
          puedeEditar={puedeGestionar}
          onCerrar={() => setFichaId(null)}
          onGuardado={onCambio}
        />
      )}
    </div>
  )
}

export default RelesDelGalpon
