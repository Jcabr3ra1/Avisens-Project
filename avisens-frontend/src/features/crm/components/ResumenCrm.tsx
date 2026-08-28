import { IcCheck, IcClose, IcFlame, IcSnowflake, IcThermo } from '@shared/ui/icons/icons'
import { RANGOS_PUNTAJE } from '../model/prospectoVista'
import type { ResumenProspectos } from '../hooks/useResumenProspectos'

type Props = {
  resumen: ResumenProspectos
}

const EMBUDO = [
  { etapa: 'frio', icono: <IcSnowflake size={12} />, label: 'Frío', color: '#60a5fa' },
  { etapa: 'tibio', icono: <IcThermo size={12} />, label: 'Tibio', color: '#fbbf24' },
  { etapa: 'caliente', icono: <IcFlame size={12} />, label: 'Caliente', color: '#f87171' },
  { etapa: 'cerrado', icono: <IcCheck size={12} />, label: 'Cliente', color: '#34d399' },
] as const

function ResumenCrm({ resumen }: Props) {
  return (
    <div className="crm-hero">
      <div className="crm-hero-top">
        <div className="crm-hero-info">
          <span className="crm-hero-kicker">EP-01 · Pipeline CRM</span>
          <h1 className="crm-hero-title">Prospectos</h1>
          <p className="crm-hero-sub">Calificados por el chatbot de cotización</p>
        </div>
        {resumen.urgentes > 0 && (
          <div className="crm-hero-urgente-badge">
            <IcFlame size={12} /> {resumen.urgentes} visita
            {resumen.urgentes > 1 ? 's' : ''} pendiente{resumen.urgentes > 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="crm-hero-stats">
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{resumen.activos}</span>
          <span className="crm-hero-stat-lbl">Prospectos activos</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{resumen.total}</span>
          <span className="crm-hero-stat-lbl">Total registrados</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{resumen.conversionPct}%</span>
          <span className="crm-hero-stat-lbl">Conversión</span>
        </div>
        <div className="crm-hero-stat-sep" />
        <div className="crm-hero-stat">
          <span className="crm-hero-stat-val">{resumen.puntajePromedio}</span>
          <span className="crm-hero-stat-lbl">Puntaje promedio</span>
        </div>
      </div>

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
            <span>{resumen.porEtapa.descartado} desc.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResumenCrm
