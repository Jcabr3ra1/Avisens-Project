import TarjetasResumen, { type Stat } from '@shared/ui/admin/TarjetasResumen'
import {
  IcChart,
  IcCheck,
  IcClose,
  IcFlame,
  IcSnowflake,
  IcThermo,
  IcUsers,
} from '@shared/ui/icons/icons'
import { RANGOS_PUNTAJE } from '../model/prospectoVista'
import type { ResumenProspectos } from '../hooks/useResumenProspectos'

type Props = {
  resumen: ResumenProspectos
}

const EMBUDO = [
  { etapa: 'frio', icono: <IcSnowflake size={12} />, label: 'Frío', color: 'var(--info3)' },
  { etapa: 'tibio', icono: <IcThermo size={12} />, label: 'Tibio', color: 'var(--warning3)' },
  { etapa: 'caliente', icono: <IcFlame size={12} />, label: 'Caliente', color: 'var(--danger3)' },
  { etapa: 'cerrado', icono: <IcCheck size={12} />, label: 'Cliente', color: 'var(--green-d)' },
] as const

function ResumenCrm({ resumen }: Props) {
  const stats: Stat[] = [
    { label: 'Prospectos activos', valor: resumen.activos, icono: <IcUsers size={19} /> },
    { label: 'Total registrados', valor: resumen.total, icono: <IcChart size={19} /> },
    { label: 'Conversión', valor: `${resumen.conversionPct}%`, icono: <IcCheck size={19} />, tono: 'ok' },
    {
      label: 'Seguimientos urgentes',
      valor: resumen.urgentes,
      icono: <IcFlame size={19} />,
      tono: resumen.urgentes > 0 ? 'peligro' : 'neutral',
    },
  ]

  return (
    <>
      <TarjetasResumen stats={stats} etiqueta="Resumen del flujo comercial" />

      <div className="crm-embudo" aria-label="Distribución de prospectos por etapa">
        <span className="crm-embudo-titulo">Flujo comercial</span>
        <div className="crm-hero-funnel">
          {EMBUDO.map(({ etapa, icono, label, color }, i) => (
            <div key={etapa} className="crm-hero-funnel-stage">
              <span className="crm-hero-funnel-cnt" style={{ color }}>
                {resumen.porEtapa[etapa]}
              </span>
              <span className="crm-hero-funnel-lbl">
                {icono} {label}
              </span>
              <span className="crm-hero-funnel-rango">{RANGOS_PUNTAJE[etapa]}</span>
              {i < EMBUDO.length - 1 && <span className="crm-hero-funnel-sep">›</span>}
            </div>
          ))}

          {resumen.porEtapa.descartado > 0 && (
            <div className="crm-hero-funnel-desc">
              <IcClose size={11} />
              <span>{resumen.porEtapa.descartado} descartados</span>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default ResumenCrm
