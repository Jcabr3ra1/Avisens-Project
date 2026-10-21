// sensorIcon.tsx — Ícono aproximado según el texto libre de `sensor.tipo`.
// El backend no restringe `tipo` a un enum, así que se infiere por
// coincidencia de texto. Un solo lugar para esta heurística — la usan
// Monitoreo, Infraestructura, Dashboard y Alertas.
import { IcThermo, IcDrop, IcCloud, IcWind, IcSun, IcSettings, IcFlame, IcFan } from '@shared/ui/icons/icons'

export function iconoSensor(tipo: string, size = 16) {
  const t = tipo.toLowerCase()
  // Relés K1-K4, con los mismos íconos que el control de actuadores.
  if (t.includes('bombillo') || t.includes('calefac')) return <IcFlame size={size} />
  if (t.includes('ventilador')) return <IcFan size={size} />
  if (t.includes('extractor')) return <IcWind size={size} />
  if (t.includes('bomba')) return <IcDrop size={size} />
  if (t.includes('temp')) return <IcThermo size={size} />
  if (t.includes('hum')) return <IcDrop size={size} />
  if (t.includes('co2') || t.includes('gas')) return <IcCloud size={size} />
  if (t.includes('nh3') || t.includes('amon')) return <IcWind size={size} />
  if (t.includes('luz') || t.includes('lum')) return <IcSun size={size} />
  return <IcSettings size={size} />
}
