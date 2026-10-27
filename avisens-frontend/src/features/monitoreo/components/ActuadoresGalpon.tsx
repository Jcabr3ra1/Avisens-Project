// ActuadoresGalpon.tsx — Monitoreo → Actuadores de un galpón.
//
// Junta lo que ya existía, sin duplicarlo: las tarjetas de control
// (ControlActuadores, que distingue estado reportado y orden en curso) y la
// ficha administrativa del relé. El registro de relés vive en la
// administración de sensores, no aquí.
import { useState } from 'react'
import { getRol } from '@shared/api'
import { ROL_ADMIN } from '@shared/auth/permisos'
import { IcServer } from '@shared/ui/icons/icons'
import FichaActuador from '@features/sensores/components/FichaActuador'
import type { SensorVista } from '../hooks/useMonitoreoAmbiental'
import { esReleControlable } from '../model/actuadores'
import { ControlActuadores } from './ControlActuadores'
// Las tarjetas usan las insignias de Monitoreo; esta sección también se abre
// fuera de esa página (pestaña del galpón, vista de Dispositivos).
import '../MonitoreoPage.css'

type Props = {
  galponId: number
  sensores: SensorVista[]
  onCambio: () => void
}

// K1..K4 por canal primero; los antiguos sin canal al final.
function clave(rele: SensorVista): string {
  return `${rele.canal ? '0' + rele.canal : '1' + rele.codigo}`
}

export function ActuadoresGalpon({ galponId, sensores, onCambio }: Props) {
  const [fichaId, setFichaId] = useState<number | null>(null)
  const esAdmin = getRol() === ROL_ADMIN
  const reles = sensores.filter(esReleControlable).sort((a, b) => clave(a).localeCompare(clave(b)))
  const sinCanal = reles.filter((r) => !r.canal).length

  if (reles.length === 0) {
    return (
      <div className="mon-offline-msg adm-panel">
        <IcServer size={32} />
        <p>
          Este galpón no tiene relés K1-K4 registrados.{' '}
          {esAdmin
            ? 'Regístralos en «Configurar controladores y sensores» → Actuadores, con «Registrar relés».'
            : 'Pide al administrador de AVISENS que los registre.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {sinCanal > 0 && (
        <div className="mon-alert adm-aviso" role="status">
          {sinCanal === 1 ? 'Un relé no tiene' : `${sinCanal} relés no tienen`} canal registrado: el firmware
          actualizado no podrá recibir sus órdenes.{' '}
          {esAdmin ? 'Usa «Registrar relés» para asociarlos sin perder su historial.' : 'Avísale al administrador.'}
        </div>
      )}

      <ControlActuadores
        key={galponId}
        galponId={galponId}
        reles={reles}
        onOrdenFinalizada={onCambio}
        onAbrirFicha={(rele) => setFichaId(rele.id)}
      />

      {fichaId !== null && (
        <FichaActuador
          sensorId={fichaId}
          puedeEditar={esAdmin}
          onCerrar={() => setFichaId(null)}
          onGuardado={onCambio}
        />
      )}
    </>
  )
}
