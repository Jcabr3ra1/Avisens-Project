// sensorIcon.tsx — Ícono aproximado según el texto libre de `sensor.tipo`.
// El backend no restringe `tipo` a un enum, así que se infiere por
// coincidencia de texto. Un solo lugar para esta heurística — la usan
// Monitoreo, Infraestructura, Dashboard y Alertas.
import { IcThermo, IcDrop, IcCloud, IcWind, IcSun, IcSettings } from '@shared/ui/icons/icons'

export function iconoSensor(tipo: string, size = 16) {
  const t = tipo.toLowerCase()
  if (t.includes('temp')) return <IcThermo size={size} />
  if (t.includes('hum')) return <IcDrop size={size} />
  if (t.includes('co2') || t.includes('gas')) return <IcCloud size={size} />
  if (t.includes('nh3') || t.includes('amon')) return <IcWind size={size} />
  if (t.includes('luz') || t.includes('lum')) return <IcSun size={size} />
  return <IcSettings size={size} />
}
