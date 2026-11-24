// RelesDelGalpon.tsx — Administración de los relés K1-K4 de un galpón:
// «Registrar relés» para un ESP32 y la lista de actuadores con su ficha.
import { useMemo, useState } from 'react'
import { mensajeDeError } from '@shared/utils/errores'
import type { Dispositivo } from '@features/dispositivos/api/dispositivos'
import { registrarReles, type RegistroReles, type Sensor } from '../api/sensores'
import { esSensorRele, etiquetaRele, mensajeRegistroReles } from '../model/reles'
import FichaActuador from './FichaActuador'
import './RelesDelGalpon.css'

type Props = {
  galponId: number
  dispositivos: Dispositivo[]
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

function ordenRele(sensor: Sensor): string {
  return `${sensor.canal ? '0' : '1'}${etiquetaRele(sensor) ?? 'K9'}${sensor.dispositivo.codigo_topic}`
}

function RelesDelGalpon({ galponId, dispositivos, sensores, puedeGestionar, onCambio }: Props) {
  const [eleccion, setEleccion] = useState<number | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [resultado, setResultado] = useState<RegistroReles | null>(null)
  const [error, setError] = useState('')
  const [fichaId, setFichaId] = useState<number | null>(null)

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
      setError(mensajeDeError(problema, 'No se pudieron registrar los relés.'))
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="rg">
      {puedeGestionar && (
        <div className="rg-registro">
          <div className="rg-registro-fila">
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
          </div>
          <p className="cs-nota rg-ayuda">
            Crea los relés K1-K4 que falten para ese ESP32 sin duplicar los existentes. Se controlan desde la pestaña Actuadores.
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
        <div className="rg-vacio">
          <p>Este galpón todavía no tiene relés K1-K4 registrados.</p>
        </div>
      ) : (
        <ul className="rg-grid" aria-label="Actuadores del galpón">
          {reles.map((s) => (
            <li key={s.id} className={`rg-card${s.estado === 'activo' ? '' : ' is-inactivo'}`}>
              <div className="rg-card-top">
                <span className={`rg-canal-pill${s.canal ? '' : ' is-alerta'}`}>
                  {s.canal ? <strong>{etiquetaRele(s)}</strong> : <span className="rg-sin-canal">Sin canal</span>}
                </span>
                <span className="rg-actuador">
                  <strong>{s.tipo}</strong>
                  <small>{s.estado === 'activo' ? 'Activo' : s.estado}</small>
                </span>
              </div>
              <div className="rg-card-codigos">
                <code className="cs-codigo">{s.dispositivo.codigo_topic}</code>
                <code className="cs-codigo">{s.codigo}</code>
              </div>
              <div className="rg-card-pie">
                <button type="button" className="cs-accion" onClick={() => setFichaId(s.id)}>
                  {puedeGestionar ? 'Ficha / editar' : 'Ficha'}
                </button>
              </div>
            </li>
          ))}
        </ul>
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
