import { ESTILO_ETAPA } from '../model/etapas'
import type { EtapaProspecto } from '../model/prospectoVista'

function ChipTemperatura({ etapa }: { etapa: EtapaProspecto }) {
  const estilo = ESTILO_ETAPA[etapa]
  return (
    <span className={`pros-chip pros-chip--${etapa}`}>
      <span aria-hidden="true">{estilo.icono}</span>
      {estilo.label}
    </span>
  )
}

export default ChipTemperatura
